package me.projectexledger.domain.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;

/**
 * 사용자(회원) 엔티티
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean mfaEnabled = false;

    @Column(length = 100)
    private String totpSecret;

    @Column(length = 20)
    private String businessNumber;

    @Column(nullable = false)
    private boolean isApproved = false;

    @Builder
    public Member(String email, String password, String name, Role role, String businessNumber) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.businessNumber = businessNumber;

        // 기업 관리자이거나 최고 관리자면 가입 즉시 승인 상태로 처리
        if (role == Role.ROLE_COMPANY_ADMIN || role == Role.ROLE_INTEGRATED_ADMIN) {
            this.isApproved = true;
        }
    }

    public enum Role {
        ROLE_USER,
        ROLE_COMPANY_ADMIN,
        ROLE_INTEGRATED_ADMIN
    }

    public void enableMfa() {
        this.mfaEnabled = true;
    }

    public void updateTotpSecret(String secret) {
        this.totpSecret = secret;
    }

    public void requestCompanyApproval(String businessNumber) {
        this.businessNumber = businessNumber;
        this.isApproved = false; // 재요청 시 다시 미승인 대기 상태로
    }

    public void approveCompany() {
        this.isApproved = true;
    }
}
