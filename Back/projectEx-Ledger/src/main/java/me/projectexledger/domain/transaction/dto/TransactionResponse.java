package me.projectexledger.domain.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class TransactionResponse {
    private Long transactionId;      // 거래 고유 ID
    private String userId;           // 사용자 식별자
    private BigDecimal amount;       // 외화 원금
    private String currency;         // 통화 코드 (USD, JPY 등)
    private BigDecimal appliedRate;  // 정산 시 적용된 환율
    private BigDecimal convertedAmount; // 최종 원화 정산 금액
    private String status;           // 현재 상태 (PENDING, SETTLED 등)
    private LocalDateTime createdAt; // 거래 발생 시간
}