package me.projectexledger.domain.config.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String configKey; // 설정키 (예: REMITTANCE_NORMAL_FEE_RATE)

    @Column(nullable = false)
    private String configValue; // 설정값 (예: "0.005")

    private String description; // 설명 (예: "일반 고객 송금 수수료율")

    private String updatedBy; // 수정한 관리자 ID (이력 추적용)

    private LocalDateTime updatedAt; // 수정 일시

    private Long lastSettlementBatchId; // 마지막 정산 배치 ID

    @PreUpdate
    @PrePersist
    public void updateTime() {
        this.updatedAt = LocalDateTime.now();
    }
}