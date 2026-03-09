package me.projectexledger.domain.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class TransactionRequest {

    @NotNull(message = "금액은 필수입니다.")
    @DecimalMin(value = "0.01", message = "금액은 0보다 커야 합니다.")
    private BigDecimal amount; // 외화 금액

    @NotBlank(message = "통화 코드는 필수입니다. (예: USD)")
    private String currency;   // 통화 코드

    private String description; // 거래 내용

    @NotBlank(message = "외부 거래 ID는 필수입니다.")
    private String externalTransactionId;
}