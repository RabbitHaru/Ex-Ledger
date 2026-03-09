package me.projectexledger.domain.payment.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.client.entity.Client;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 *  결제 및 송금 원천 로그
 * 결제 신청 시 데이터를 쌓고, 정산 시 이 데이터를 검증합니다.
 */
@Entity
@Table(name = "payment_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client; // Member A가 승인한 기업 정보

    @Column(nullable = false, unique = true)
    private String orderId;       // 포트원 V2 결제 고유 ID (대사 키)

    @Column(nullable = false)
    private BigDecimal amount;    // 고객이 신청한 원천 결제 금액

    @Column(nullable = false)
    private String currency;      // 통화 (KRW, USD, VND 등)

    // --- 수수료 필드 (Member A의 정책 반영) ---
    private BigDecimal siteFee;      // 등급별 사이트 수수료
    private BigDecimal networkFee;   // 국가별 네트워크 비용 (실비)
    private BigDecimal totalFee;     // 최종 합산 수수료

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 결제 생성 시 시간 자동 설정
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}