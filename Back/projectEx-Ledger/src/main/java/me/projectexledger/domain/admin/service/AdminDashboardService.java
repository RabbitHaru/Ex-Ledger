package me.projectexledger.domain.admin.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.payment.entity.PaymentStatus;
import me.projectexledger.domain.payment.repository.PaymentLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final PaymentLogRepository paymentLogRepository;

    /**
     * 대시보드 요약 데이터 집계
     * 전체 결제 합계 및 해외 송금 집행 현황을 요약합니다.
     */
    public DashboardSummaryDTO getDashboardSummary() {
        // 1. 전체 결제 합계 계산 (Status: COMPLETED 기준)
        BigDecimal totalAmount = paymentLogRepository.sumTotalAmountByStatus(PaymentStatus.COMPLETED);
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;

        // 2. 송금 집행 현황 카운트
        long completed = paymentLogRepository.countByStatus(PaymentStatus.COMPLETED);
        long requested = paymentLogRepository.countByStatus(PaymentStatus.REQUESTED);
        long failed = paymentLogRepository.countByStatus(PaymentStatus.FAILED);

        // 3. (임시) 대사 오차 건수 - 나중에 정산 엔진 연동 시 업데이트
        long discrepancy = 0;

        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount)
                .totalRemittanceCount(completed + requested + failed)
                .completedRemittanceCount(completed)
                .pendingRemittanceCount(requested)
                .failedRemittanceCount(failed)
                .discrepancyCount(discrepancy)
                .build();
    }
}