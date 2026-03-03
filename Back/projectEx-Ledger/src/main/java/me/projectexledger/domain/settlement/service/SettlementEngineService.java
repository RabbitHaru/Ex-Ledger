package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.payment.repository.PaymentLogRepository;
import me.projectexledger.domain.settlement.api.PortOneClient;
import me.projectexledger.infrastructure.external.portone.dto.PortOnePaymentResponse;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.entity.RemittanceHistory;
import me.projectexledger.domain.settlement.repository.RemittanceHistoryRepository;
import me.projectexledger.domain.settlement.entity.Settlement;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.domain.settlement.util.ExchangeRateCalculator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

        BigDecimal liveUsdRate = exchangeRateCalculator.getUsdExchangeRate();
        log.info("[Settlement] 오늘자 실시간 USD 환율 적용: {}원", liveUsdRate);

        response.getItems().forEach(item -> {
            if (settlementRepository.existsByOrderId(item.getId())) return;

            String clientName = (item.getCustomer() != null && item.getCustomer().getName() != null)
                    ? item.getCustomer().getName() : "익명 고객";

            BigDecimal totalAmount = item.getAmount().getTotal();
            String currency = item.getCurrency();
            BigDecimal settlementAmount;

            if ("USD".equalsIgnoreCase(currency)) {
                settlementAmount = totalAmount.multiply(liveUsdRate).setScale(0, RoundingMode.HALF_UP);
                log.info("[Settlement] USD 결제 변환: {} USD -> {} KRW (주문번호: {})", totalAmount, settlementAmount, item.getId());
            } else {
                settlementAmount = totalAmount;
            }

            settlementRepository.save(Settlement.builder()
                    .orderId(item.getId())
                    .transactionId(item.getId())
                    .clientName(clientName)
                    .amount(totalAmount)
                    .currency(currency)
                    .settlementAmount(settlementAmount)
                    .baseRate(liveUsdRate)
                    .finalAppliedRate(liveUsdRate)
                    .preferredRate(BigDecimal.ZERO)
                    .spreadFee(BigDecimal.ZERO)
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

    // 🚨 [핵심 추가] 테스트 결제 데이터를 강제로 DB에 밀어넣는 메서드입니다!
    @Transactional
    public void createTestSettlement(String orderId, String clientName, BigDecimal amount, String currency, SettlementStatus status) {
        // DB 제약조건(NOT NULL)을 피하기 위해 환율 관련 필드들에 기본값을 꽉꽉 채웠습니다.
        settlementRepository.save(Settlement.builder()
                .orderId(orderId)
                .transactionId("TX-" + System.currentTimeMillis())
                .clientName(clientName)
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
}