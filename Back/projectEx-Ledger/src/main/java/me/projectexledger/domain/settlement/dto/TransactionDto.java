package me.projectexledger.domain.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter @Builder
@NoArgsConstructor @AllArgsConstructor
public class TransactionDto {
    private String id;
    private LocalDate date;
    private String title;
    private Long amount;
    private String currency;
    private String status;
}