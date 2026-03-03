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
        // 🚨 DashboardSummaryDTO의 빌더를 사용하여 데이터를 조립합니다.
        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalRemittanceCount(settlementRepository.count())
                .completedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.COMPLETED))
                .pendingRemittanceCount(settlementRepository.countByStatus(SettlementStatus.PENDING))
                .failedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.FAILED))
                .discrepancyCount(settlementRepository.countByStatus(SettlementStatus.DISCREPANCY))
                .build();
    }

    @Transactional
    public void processDailySettlement(String targetDate) {
        PortOnePaymentResponse response = portOneClient.getPayments(targetDate, targetDate, 0, 100);

        response.getItems().forEach(item -> {
            // 🚨 [해결] item.getId()로 호출 (DTO가 클래스 방식일 때 가장 안정적)
            if (settlementRepository.existsByOrderId(item.getId())) return;

            String clientName = (item.getCustomer() != null && item.getCustomer().getName() != null)
                    ? item.getCustomer().getName() : "익명 고객";

            BigDecimal totalAmount = item.getAmount().getTotal();
            BigDecimal settlementAmount = totalAmount.multiply(new BigDecimal("1350.50"));

            settlementRepository.save(Settlement.builder()
                    .orderId(item.getId())
                    .transactionId(item.getId())
                    .clientName(clientName)
                    .amount(totalAmount)
                    .currency(item.getCurrency())
                    .settlementAmount(settlementAmount)
                    .status(SettlementStatus.PENDING)
                    .build());
        });
    }

    public List<ReconciliationListDTO> getReconciliationList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Settlement> settlements = settlementRepository.findAll(pageable);

        return settlements.stream().map(s -> ReconciliationListDTO.builder()
                .id(s.getId())
                .orderId(s.getOrderId())
                .clientName(s.getClientName())      // 🚨 TSX 틀 유지
                .originalAmount(s.getAmount())      // 🚨 TSX 틀 유지
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
}