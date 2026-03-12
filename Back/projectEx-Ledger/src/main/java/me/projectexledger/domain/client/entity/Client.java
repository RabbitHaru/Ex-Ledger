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
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Client extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;              // 기업명

    @Column(nullable = false, unique = true)
    private String businessNumber;    // 사업자번호

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClientStatus status;      // 가입 상태: PENDING, APPROVED, REJECTED

    // 🌟 [유지] 정산 엔진이 돈을 꽂아줄 '어디로' 정보는 클라이언트에 있어야 합니다.
    @Column(name = "bank_name", length = 50)
    private String bankName;          // 정산 입금 은행

    @Column(name = "account_number", length = 50)
    private String accountNumber;     // 정산 입금 계좌번호

    // 🌟 [핵심] 수수료 정책과 연결해줄 '고유 키'
    @Column(name = "merchant_id", unique = true)
    private String merchantId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) // 👈 길이를 명시적으로 지정!
    private ClientGrade grade = ClientGrade.GENERAL;

    // 가입 승인 로직
    public void approve() {
        this.status = ClientStatus.APPROVED;
    }

    // 🌟 등급 업데이트 메서드 (ClientGradeService에서 호출)
    public void setGrade(ClientGrade grade) {
        this.grade = grade;
    }

    // 🌟 [수정] 정책 업데이트 메서드 단순화
    // 이제 값(수수료율 등)은 여기서 저장하지 않고 등급만 바꿉니다.
    public void updateGradeStatus(ClientGrade grade) {
        this.grade = grade;
    }
}