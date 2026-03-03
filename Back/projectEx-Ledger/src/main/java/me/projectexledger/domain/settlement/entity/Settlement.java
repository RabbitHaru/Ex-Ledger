package me.projectexledger.domain.settlement.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.common.util.ReconciliationUtil;
import me.projectexledger.domain.BaseEntity;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.math.BigDecimal;

@Entity
@Table(name = "settlements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Settlement extends BaseEntity implements ReconciliationUtil.InternalTxDto {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String orderId;

    @Column(name = "transaction_id", nullable = false, unique = true)
    private String transactionId;

    @Column(nullable = false)
    private String clientName;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal settlementAmount;

    @Column(name = "base_rate", precision = 19, scale = 4)
    private BigDecimal baseRate;

    @Column(name = "final_applied_rate", precision = 19, scale = 4)
    private BigDecimal finalAppliedRate;

    @Column(name = "preferred_rate", precision = 19, scale = 4)
    private BigDecimal preferredRate;

    // 🚨 [추가] 환전 수수료(스프레드) 저장 변수
    @Column(name = "spread_fee", precision = 19, scale = 4)
    private BigDecimal spreadFee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @Column(name = "resolution_reason", length = 500)
    private String resolutionReason;

    // 🚨 [수정] 빌더에 spreadFee 추가
    @Builder
    public Settlement(String orderId, String transactionId, String clientName, BigDecimal amount,
                      String currency, BigDecimal settlementAmount, SettlementStatus status,
                      BigDecimal baseRate, BigDecimal finalAppliedRate, BigDecimal preferredRate, BigDecimal spreadFee) {
        this.orderId = orderId;
        this.transactionId = transactionId;
        this.clientName = clientName;
        this.amount = amount;
        this.currency = currency;
        this.settlementAmount = settlementAmount;
        this.status = status;
        this.baseRate = baseRate;
        this.finalAppliedRate = finalAppliedRate;
        this.preferredRate = preferredRate;
        this.spreadFee = spreadFee; // 🚨 추가
    }

    @Override public String getTransactionId() { return this.orderId; }
    @Override public BigDecimal getAmount() { return this.amount; }

    public void markAsCompleted() { this.status = SettlementStatus.COMPLETED; }
    public void markAsDiscrepancy() { this.status = SettlementStatus.DISCREPANCY; }
    public void markAsResolved(String reason) {
        this.status = SettlementStatus.COMPLETED;
        this.resolutionReason = reason;
    }
    public void updateSettlementAmount(BigDecimal correctedAmount) { this.settlementAmount = correctedAmount; }
    public void updateStatus(SettlementStatus status) { this.status = status; }
}