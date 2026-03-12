package me.projectexledger.domain.settlement.entity;

import jakarta.persistence.*;
import lombok.*;
import me.projectexledger.common.util.ReconciliationUtil;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.common.config.AesCryptoConverter;
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

    @Column(name = "merchant_id", length = 50)
    private String merchantId;

    @Column(name = "transaction_id", nullable = false, unique = true)
    private String transactionId;

    @Convert(converter = AesCryptoConverter.class)
    @Column(nullable = false, length = 255)
    private String clientName;

    // 🌟 [입금 대상 정보] - 프론트엔드 및 송금 실행 시 필수
    @Column(name = "bank_name", length = 50)
    private String bankName;

    @Convert(converter = AesCryptoConverter.class)
    @Column(name = "account_number", length = 255)
    private String accountNumber;

    // 🌟 [금액 데이터] - 금융권 표준 정밀도(19, 4) 적용
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount; // 원금 (USD)

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal settlementAmount; // 최종 정산액 (KRW)

    // 🌟 [환율 및 수수료 상세 정보] - 감사(Audit) 시 필수 데이터
    @Column(name = "base_rate", precision = 19, scale = 4)
    private BigDecimal baseRate; // 기준 환율

    @Column(name = "final_applied_rate", precision = 19, scale = 4)
    private BigDecimal finalAppliedRate; // 마진/우대율 적용 환율

    @Column(name = "preferred_rate", precision = 19, scale = 4)
    private BigDecimal preferredRate; // 적용 우대율

    @Column(name = "spread_fee", precision = 19, scale = 4)
    private BigDecimal spreadFee; // 적용 스프레드 마진

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @Column(name = "resolution_reason", length = 500)
    private String resolutionReason;

    // 🌟 [빌더] - SettlementEngineService에서 데이터 저장 시 사용
    @Builder
    public Settlement(String orderId, String transactionId,
                      String merchantId, // 🌟 [수정/추가] 파라미터에 누락되었던 merchantId를 추가했습니다!
                      String clientName, String bankName, String accountNumber, BigDecimal amount,
                      String currency, BigDecimal settlementAmount, SettlementStatus status,
                      BigDecimal baseRate, BigDecimal finalAppliedRate, BigDecimal preferredRate, BigDecimal spreadFee) {
        this.orderId = orderId;
        this.transactionId = transactionId;
        this.merchantId = merchantId;
        this.clientName = clientName;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.amount = amount;
        this.currency = currency;
        this.settlementAmount = settlementAmount;
        this.status = status;
        this.baseRate = baseRate;
        this.finalAppliedRate = finalAppliedRate;
        this.preferredRate = preferredRate;
        this.spreadFee = spreadFee;
    }

    // 🌟 [비즈니스 로직 메서드]
    @Override public String getTransactionId() { return this.orderId; }
    @Override public BigDecimal getAmount() { return this.amount; }

    public void markAsCompleted() { this.status = SettlementStatus.COMPLETED; }
    public void markAsDiscrepancy() { this.status = SettlementStatus.DISCREPANCY; }
    public void markAsResolved(String reason) {
        this.status = SettlementStatus.WAITING_USER_CONSENT;
        this.resolutionReason = reason;
    }
    public void updateSettlementAmount(BigDecimal correctedAmount) { this.settlementAmount = correctedAmount; }
    public void updateStatus(SettlementStatus status) { this.status = status; }
}