package me.projectexledger.domain.company.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.domain.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "settlement_policies")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SettlementPolicy extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 가맹점의 정책인지 매핑 (가맹점 ID)
    @Column(nullable = false, unique = true)
    private String merchantId;

    // 1. 플랫폼 중개 수수료율 (예: 1.5% -> 0.0150)
    @Column(precision = 7, scale = 4, nullable = false)
    private BigDecimal platformFeeRate;

    // 2. 국가별 고정 네트워크 수수료 (예: 2000원 -> 2000.00)
    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal networkFee;

    // 3. 환전 스프레드 (가산금) (예: 달러당 10원 -> 10.0000)
    @Column(precision = 10, scale = 4, nullable = false)
    private BigDecimal exchangeSpread;

    // 4. 환율 우대율 (예: 90% 우대 -> 0.9000)
    @Column(precision = 7, scale = 4, nullable = false)
    private BigDecimal preferenceRate;

    /**
     * 관리자(A)가 어드민 화면에서 수수료를 변경할 때 사용하는 메서드
     */
    public void updatePolicy(BigDecimal platformFeeRate, BigDecimal networkFee,
                             BigDecimal exchangeSpread, BigDecimal preferenceRate) {
        this.platformFeeRate = platformFeeRate;
        this.networkFee = networkFee;
        this.exchangeSpread = exchangeSpread;
        this.preferenceRate = preferenceRate;
    }
}