package me.projectexledger.domain.settlement.dto.response;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * [관리자 대시보드] 요약 데이터 응답 DTO
 */
@Builder
public record DashboardSummaryResponse(
        BigDecimal totalSettlementAmount, // 총 정산(결제) 금액
        int pendingCount                  // 대기 중인 정산/송금 건수
) {
}