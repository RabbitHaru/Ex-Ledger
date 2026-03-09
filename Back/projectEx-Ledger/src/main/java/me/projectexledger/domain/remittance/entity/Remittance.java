package me.projectexledger.domain.remittance.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.domain.BaseEntity;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;

@Entity
@Table(name = "remittances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Remittance extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. 신청자 정보
    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    // 2. 수취인 정보
    @Column(name = "receiver_name", nullable = false)
    private String receiverName;

    @Column(name = "receiver_account", nullable = false)
    private String receiverAccount;

    @Column(name = "receiver_bank", nullable = false)
    private String receiverBank;

    // 3. 금액 및 환율 정보
    @Column(name = "foreign_currency_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal foreignCurrencyAmount;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "exchange_rate", precision = 19, scale = 4)
    private BigDecimal exchangeRate;

    @Column(name = "krw_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal krwAmount;

    // 4. 수수료 정보
    @Column(name = "remittance_fee", precision = 19, scale = 4)
    private BigDecimal remittanceFee;

    // 5. 송금 상태 (문자열 잘림 방지를 위해 length=30으로 확장)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RemittanceStatus status;

    @Builder
    public Remittance(String requesterId, String receiverName, String receiverAccount, String receiverBank,
                      BigDecimal foreignCurrencyAmount, String currency, BigDecimal exchangeRate,
                      BigDecimal krwAmount, BigDecimal remittanceFee, RemittanceStatus status) {
        this.requesterId = requesterId;
        this.receiverName = receiverName;
        this.receiverAccount = receiverAccount;
        this.receiverBank = receiverBank;
        this.foreignCurrencyAmount = foreignCurrencyAmount;
        this.currency = currency;
        this.exchangeRate = exchangeRate;
        this.krwAmount = krwAmount;
        this.remittanceFee = remittanceFee != null ? remittanceFee : BigDecimal.ZERO;

        // 🌟 수정됨: 초기 신청 시 기본 상태를 '승인 대기(WAITING)'로 설정
        this.status = status != null ? status : RemittanceStatus.WAITING;
    }

    // 상태 업데이트 편의 메서드
    public void updateStatus(RemittanceStatus status) {
        this.status = status;
    }
}