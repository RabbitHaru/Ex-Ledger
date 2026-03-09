package me.projectexledger.domain.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.member.entity.Member;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Transaction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(precision = 18, scale = 2)
    private BigDecimal appliedRate;

    @Column(precision = 18, scale = 2)
    private BigDecimal convertedAmount;

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;

    @Column(unique = true)
    private String externalTransactionId;

    private String description;

    public void calculateSettlement(BigDecimal rate) {
        this.appliedRate = rate;
        this.convertedAmount = amount.multiply(rate).setScale(0, RoundingMode.HALF_UP);
        this.status = TransactionStatus.EXCHANGE_COMPLETED;
    }

    public void markAsSettled() {
        this.status = TransactionStatus.SETTLED;
    }

    public void markAsDiscrepancy() {
        this.status = TransactionStatus.FAILED;
    }
}