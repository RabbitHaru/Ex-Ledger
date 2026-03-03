package me.projectexledger.domain.transaction.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.domain.BaseEntity;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "transactions")
public class Transaction extends BaseEntity { // B님이 만든 BaseEntity 상속

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId; // AuthController의 principal.getName() 값 저장

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount; // 외화 금액 (예: 100.00)

    @Column(nullable = false, length = 10)
    private String currency; // 통화 코드 (USD, JPY 등 - A님의 데이터와 매칭)

    @Column(precision = 18, scale = 2)
    private BigDecimal appliedRate; // 정산 시 적용된 환율 (A님에게 받아올 값)

    @Column(precision = 18, scale = 2)
    private BigDecimal convertedAmount; // 환산된 원화 금액

    private String description; // 거래 내용 (예: "스타벅스 뉴욕점")

    // 비즈니스 로직: 정산 실행
    public void updateSettlement(BigDecimal rate) {
        this.appliedRate = rate;
        // 외화 금액 * 환율 = 원화 금액 (소수점은 B님의 ReconciliationUtil 규칙에 따라 나중에 정밀 조정)
        this.convertedAmount = this.amount.multiply(rate).setScale(0, RoundingMode.HALF_UP);
    }
}