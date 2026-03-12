package me.projectexledger.domain.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SettlementSummaryDto {
    private Long companyId;
    private String companyName;
    private Long totalTransactionAmount; // 총 거래액
    private Long totalServiceFee;        // 총 서비스 수수료 (0.3%)
    private Long netSettlementAmount;    // 최종 정산 예정 금액
}