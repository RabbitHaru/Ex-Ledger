package me.projectexledger.domain.client.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import me.projectexledger.domain.BaseEntity;

@Entity
@Table(name = "clients")
@Getter
@Builder // 🌟 서비스에서 가짜/테스트 데이터 생성 시 편하게 쓰기 위해 추가
@AllArgsConstructor // 🌟 Builder 사용을 위해 추가
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Client extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;              // 기업명 (예: (주)엑스레저)

    @Column(nullable = false, unique = true)
    private String businessNumber;    // 사업자번호 (Member B의 검증 대상)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClientStatus status;      // 가입 상태: PENDING, APPROVED, REJECTED

    @Column(nullable = false, precision = 5, scale = 4)
    private BigDecimal feeRate;       // 수수료율 (예: 0.015)

    // 🌟 [추가] 정산 엔진과 연동될 핵심 데이터!
    @Column(name = "bank_name", length = 50)
    private String bankName;          // 정산 입금 은행

    @Column(name = "account_number", length = 50)
    private String accountNumber;     // 정산 입금 계좌번호

    @Column(name = "preference_rate", precision = 5, scale = 4)
    private BigDecimal preferenceRate; // 환율 우대율 (예: 0.90)

    // 가입 승인 로직
    public void approve() {
        this.status = ClientStatus.APPROVED;
    }

    // 수수료율 업데이트 로직 (관리자 기능)
    public void updateFeeRate(BigDecimal newRate) {
        this.feeRate = newRate;
    }
}