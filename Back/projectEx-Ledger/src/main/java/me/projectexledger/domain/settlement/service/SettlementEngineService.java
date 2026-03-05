package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.payment.repository.PaymentLogRepository;
import me.projectexledger.domain.settlement.api.PortOneClient;
import me.projectexledger.portone.Response.PortOnePaymentResponse;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.entity.RemittanceHistory;
import me.projectexledger.domain.settlement.repository.RemittanceHistoryRepository;
import me.projectexledger.domain.settlement.entity.Settlement;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.domain.settlement.util.ExchangeRateCalculator;
import me.projectexledger.domain.exchange.service.CurrencyCalculator;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementEngineService {

    private final PaymentLogRepository paymentLogRepository;
    private final SettlementRepository settlementRepository;
    private final ExchangeRateCalculator exchangeRateCalculator;
    private final PortOneClient portOneClient;
    private final RemittanceHistoryRepository remittanceHistoryRepository;
    private final CurrencyCalculator currencyCalculator;
    private final ClientRepository clientRepository;

    public DashboardSummaryDTO getDashboardSummary() {
        BigDecimal totalAmount = settlementRepository.sumTotalSettlementAmountByStatus(SettlementStatus.COMPLETED);
        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalRemittanceCount(settlementRepository.count())
                .completedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.COMPLETED))
                .pendingRemittanceCount(settlementRepository.countByStatus(SettlementStatus.PENDING))
                .failedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.FAILED))
                .discrepancyCount(settlementRepository.countByStatus(SettlementStatus.DISCREPANCY))
                .inProgressRemittanceCount(settlementRepository.countByStatus(SettlementStatus.IN_PROGRESS))
                .waitingRemittanceCount(settlementRepository.countByStatus(SettlementStatus.WAITING))
                .build();
    }

    @Transactional
    public void processDailySettlement(String targetDate) {
        log.info("[Settlement] {} 일자 포트원 정산 데이터 동기화 시작", targetDate);
        PortOnePaymentResponse response = portOneClient.getPayments(targetDate, targetDate, 0, 100);

        // 🌟 1. 일단 계산용 임시 변수에 환율을 받습니다.
        BigDecimal tempRate = exchangeRateCalculator.getUsdExchangeRate();

        // 2순위 방어 로직
        if (tempRate == null || tempRate.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("⚠️ [Exchange] 실시간 API 응답 없음(주말/11시). 2순위 일일 고시 API를 호출합니다.");
            tempRate = exchangeRateCalculator.getDailyStandardRate();

            // 3순위 방어 로직
            if (tempRate == null || tempRate.compareTo(BigDecimal.ZERO) <= 0) {
                log.error("🚨 [Exchange] 모든 외부 API 응답 실패. DB의 최신 저장 환율을 적용합니다.");
                tempRate = exchangeRateCalculator.getLatestStoredRate();
            }
        }

        // 안전장치
        if (tempRate == null || tempRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("유효한 환율 데이터를 확보하지 못해 정산 배치를 중단합니다.");
        }

        // 🌟 2. 람다식(forEach) 안에서 에러 없이 쓰기 위해 final 변수로 '고정'시킵니다! (빨간줄 해결)
        final BigDecimal finalLiveUsdRate = tempRate;

        log.info("[Settlement] 오늘자 최종 적용 USD 환율: {}원", finalLiveUsdRate);

        BigDecimal networkFee = new BigDecimal("2000");
        BigDecimal spread = new BigDecimal("20.0");

        response.getItems().forEach(item -> {
            if (settlementRepository.existsByOrderId(item.getId())) return;

            String clientName = (item.getCustomer() != null && item.getCustomer().getName() != null)
                    ? item.getCustomer().getName() : "익명 고객";

            Client client = clientRepository.findByName(clientName).orElse(null);

            BigDecimal platformFeeRate;
            BigDecimal preferenceRate;
            String targetBank;
            String targetAccount;

            if (client != null && client.getFeeRate() != null) {
                platformFeeRate = client.getFeeRate();
                preferenceRate = client.getPreferenceRate() != null ? client.getPreferenceRate() : new BigDecimal("0.90");
                targetBank = client.getBankName();
                targetAccount = client.getAccountNumber();
                log.info("[Settlement] 🏢 DB 가맹점 정책 적용: {} (수수료 {}, 우대 {})", clientName, platformFeeRate, preferenceRate);
            } else {
                platformFeeRate = new BigDecimal("0.015");
                preferenceRate = new BigDecimal("0.90");
                targetBank = "미등록은행";
                targetAccount = "계좌확인요망";
                log.info("[Settlement] ⚠️ 미등록 가맹점 기본 정책 적용: {}", clientName);
            }

            BigDecimal totalAmount = item.getAmount().getTotal();
            String currency = item.getCurrency();
            BigDecimal settlementAmount = totalAmount;

            // 🌟 3. 여기서 고정된 환율 변수(finalLiveUsdRate)를 사용합니다!
            BigDecimal finalAppliedRate = finalLiveUsdRate;

            if ("USD".equalsIgnoreCase(currency)) {
                settlementAmount = currencyCalculator.calculateFinalSettlementAmount(
                        totalAmount, finalLiveUsdRate, platformFeeRate, networkFee, spread, preferenceRate
                );
                finalAppliedRate = currencyCalculator.calculateFinalRate(finalLiveUsdRate, spread, preferenceRate);
                log.info("[Settlement] 수수료 적용 완료: {} USD -> {} KRW (주문번호: {})", totalAmount, settlementAmount, item.getId());
            }

            settlementRepository.save(Settlement.builder()
                    .orderId(item.getId())
                    .transactionId(item.getId())
                    .clientName(clientName)
                    .bankName(targetBank)
                    .accountNumber(targetAccount)
                    .amount(totalAmount)
                    .currency(currency)
                    .settlementAmount(settlementAmount)
                    .baseRate(finalLiveUsdRate) // 고정값 세팅
                    .finalAppliedRate(finalAppliedRate)
                    .preferredRate(preferenceRate)
                    .spreadFee(spread)
                    .status(SettlementStatus.PENDING)
                    .build());
        });
        log.info("[Settlement] 정산 데이터 동기화 완료");
    }

    public List<ReconciliationListDTO> getReconciliationList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Settlement> settlements = settlementRepository.findAll(pageable);

        return settlements.stream().map(s -> ReconciliationListDTO.builder()
                .id(s.getId())
                .orderId(s.getOrderId())
                .clientName(s.getClientName())
                .bankName(s.getBankName())
                .accountNumber(s.getAccountNumber())
                .amount(s.getAmount())
                .originalAmount(s.getAmount())
                .settlementAmount(s.getSettlementAmount())
                .status(s.getStatus().name())
                .updatedAt(s.getUpdatedAt() != null ?
                        s.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "")
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public void resolveDiscrepancy(Long settlementId, BigDecimal correctedAmount, String reason) {
        Settlement settlement = settlementRepository.findById(settlementId).orElseThrow();
        settlement.updateSettlementAmount(correctedAmount);
        settlement.markAsResolved(reason);
    }

    @Transactional
    public void retryRemittance(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId).orElseThrow();
        try {
            settlement.updateStatus(SettlementStatus.COMPLETED);
            remittanceHistoryRepository.save(RemittanceHistory.builder().settlement(settlement).status("SUCCESS").attemptCount(2).build());
        } catch (Exception e) {
            settlement.updateStatus(SettlementStatus.FAILED);
            remittanceHistoryRepository.save(RemittanceHistory.builder().settlement(settlement).status("FAILED").errorMessage(e.getMessage()).attemptCount(2).build());
        }
    }

    @Transactional
    public void createTestSettlement(String orderId, String clientName, BigDecimal amount, String currency, SettlementStatus status) {
        settlementRepository.save(Settlement.builder()
                .orderId(orderId)
                .transactionId("TX-" + System.currentTimeMillis())
                .clientName(clientName)
                .bankName("신한은행")
                .accountNumber("110-123-" + (int)(Math.random() * 9000 + 1000))
                .amount(amount)
                .currency(currency)
                .settlementAmount(amount)
                .baseRate(BigDecimal.ONE)
                .finalAppliedRate(BigDecimal.ONE)
                .preferredRate(BigDecimal.ZERO)
                .spreadFee(BigDecimal.ZERO)
                .status(status)
                .build());
        log.info("[Test] 테스트 결제 데이터 저장 완료: {}", orderId);
    }

    @Transactional
    public void approveSettlement(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("해당 정산 건을 찾을 수 없습니다. ID: " + settlementId));

        if (settlement.getStatus() != SettlementStatus.WAITING) {
            throw new IllegalStateException("승인 대기(WAITING) 상태의 건만 승인할 수 있습니다.");
        }

        settlement.updateStatus(SettlementStatus.PENDING);
        log.info("✅ [Settlement] 관리자 수동 승인 완료. 송금 대기(PENDING) 상태로 전환됨 (ID: {})", settlementId);
    }
}