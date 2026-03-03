package me.projectexledger.domain.admin.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDTO {
    private BigDecimal totalPaymentAmount;
    private long totalRemittanceCount;
    private long completedRemittanceCount;
    private long pendingRemittanceCount;
    private long failedRemittanceCount;
    private long discrepancyCount;
}