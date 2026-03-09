package me.projectexledger.domain.settlement.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;

@Entity
@Table(name = "remittance_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RemittanceHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 💡 어떤 정산 건에 대한 송금 시도인지 연결 (N:1 관계)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id", nullable = false)
    private Settlement settlement;

    // 💡 SUCCESS(성공) 또는 FAILED(실패) 상태 저장
    @Column(nullable = false, length = 50)
    private String status;

    // 💡 실패했을 경우 포트원이나 은행이 뱉은 에러 메시지
    @Column(length = 500)
    private String errorMessage;

    // 💡 재시도 회차 (1차 시도, 2차 시도...)
    @Column(nullable = false)
    private int attemptCount;

    @Builder
    public RemittanceHistory(Settlement settlement, String status, String errorMessage, int attemptCount) {
        this.settlement = settlement;
        this.status = status;
        this.errorMessage = errorMessage;
        this.attemptCount = attemptCount;
    }
}