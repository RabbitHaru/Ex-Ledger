package me.projectexledger.domain.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/**
 * [추가] 영수증 상세 명세용 DTO
 * SettlementDetailModal.tsx의 데이터 요구사항을 충족합니다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementDetailDTO {
    private String id;           // 주문번호 (orderId)
    private String createdAt;    // 정산 처리일시
    private BigDecimal amountUsd; // 송금 신청 원금 (USD)
    private BigDecimal exchangeRate; // 적용 환율 (KRW)
    private FeeBreakdown feeBreakdown; // 수수료 상세 내역
    private BigDecimal finalAmountKrw; // 최종 정산 금액
    private String status;       // 정산 상태
    private String currency;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeeBreakdown {
        private BigDecimal platform; // 플랫폼 서비스 이용료
        private BigDecimal network;  // 해외 송금 망 사용료
        private BigDecimal vat;      // 부가세 (VAT)
    }
}