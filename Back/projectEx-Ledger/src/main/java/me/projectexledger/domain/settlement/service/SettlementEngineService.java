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

        // 🌟 1. 계산용 임시 변수에 환율 확보
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

        final BigDecimal finalLiveUsdRate = tempRate;
        log.info("[Settlement] 오늘자 최종 적용 USD 환율: {}원", finalLiveUsdRate);

        BigDecimal networkFee = new BigDecimal("2000");
        BigDecimal spread = new BigDecimal("20.0");

        response.getItems().forEach(item -> {

            String clientName = (item.getCustomer() != null && item.getCustomer().getName() != null)
                    ? item.getCustomer().getName() : "익명 기업";

            // 🚨 [필터 추가] 금액이 1004원이고 가맹점이 '익명 기업'인 경우 동기화에서 제외!
            if (item.getAmount().getTotal().intValue() == 1004 && "익명 기업".equals(clientName)) {
                log.info("[Skip] 테스트용 1004원 결제건은 정산에서 제외합니다. (ID: {})", item.getId());
                return; // forEach문에서는 continue 대신 return을 사용합니다.
            }

            if (settlementRepository.existsByOrderId(item.getId())) return;

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
                    .baseRate(finalLiveUsdRate)
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

    // 🌟 [수정됨] 이름, 은행, 계좌, 돈 모두 100% 랜덤 생성!
    @Transactional
    public void createTestSettlement(String orderId, String clientName, BigDecimal amount, String currency, SettlementStatus status) {

        // 🏢 1. 발표용 랜덤 이름 리스트
        String[] clientList = {"(주)무신사", "우아한형제들", "당근마켓", "쿠팡페이", "오늘의집", "(주)로켓상사", "글로벌페이", "초록마켓", "야놀자", "네이버페이"};
        String finalClientName = clientList[(int)(Math.random() * clientList.length)];

        // 🏦 2. 발표용 랜덤 은행 리스트
        String[] bankList = {"국민은행", "농협은행", "카카오뱅크", "우리은행", "토스뱅크", "신한은행", "기업은행", "하나은행", "케이뱅크"};
        String finalBank = bankList[(int)(Math.random() * bankList.length)];

        // 💳 3. 랜덤 계좌번호 생성
        String finalAccount = (int)(Math.random() * 900 + 100) + "-123-" + (int)(Math.random() * 9000 + 1000);

        // 💰 4. 원본 결제 금액 (1만원 ~ 300만원 사이 랜덤, 100원 단위로 딱 떨어지게)
        int randomMoney = ((int)(Math.random() * 30000) + 100) * 100;
        BigDecimal originalAmount = new BigDecimal(randomMoney);

        // 🌍 5. 실시간 환율 API 호출!
        BigDecimal realUsdRate = exchangeRateCalculator.getUsdExchangeRate();
        if (realUsdRate == null) {
            realUsdRate = new BigDecimal("1400.00");
        }

        // 🧮 6. 수수료 계산 및 🌟소수점 버림(DOWN) 처리🌟
        BigDecimal feeRate = new BigDecimal("0.015"); // 수수료율 1.5% 고정
        BigDecimal platformFee = originalAmount.multiply(feeRate);
        BigDecimal networkFee = new BigDecimal("2000");

        // 원금 - 플랫폼수수료 - 망이용료 계산 후 소수점 이하는 가차없이 버림!
        BigDecimal finalSettlementAmount = originalAmount.subtract(platformFee).subtract(networkFee)
                .setScale(0, java.math.RoundingMode.DOWN);

        if (finalSettlementAmount.compareTo(BigDecimal.ZERO) < 0) {
            finalSettlementAmount = BigDecimal.ZERO;
        }

        settlementRepository.save(Settlement.builder()
                .orderId(orderId)
                .transactionId("TX-" + System.currentTimeMillis())
                .clientName(finalClientName)     // 완전 랜덤 이름
                .bankName(finalBank)             // 완전 랜덤 은행
                .accountNumber(finalAccount)     // 완전 랜덤 계좌
                .amount(originalAmount)          // 완전 랜덤 돈
                .currency(currency)
                .settlementAmount(finalSettlementAmount) // 💰 소수점 짤린 깔끔한 정산금
                .baseRate(realUsdRate)
                .finalAppliedRate(realUsdRate.subtract(new BigDecimal("10.00")))
                .preferredRate(new BigDecimal("0.02"))
                .spreadFee(new BigDecimal("10.00"))
                .status(status)
                .build());

        log.info("[Test] 랜덤 데이터 주입 완료: {} (가맹점: {}, 은행: {}, 원금: {}, 정산금: {}원)",
                orderId, finalClientName, finalBank, originalAmount, finalSettlementAmount);
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