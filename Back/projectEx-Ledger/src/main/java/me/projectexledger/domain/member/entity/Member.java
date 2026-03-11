package me.projectexledger.domain.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.company.entity.Company;

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

    // 기업 FK (nullable — 개인 회원은 null)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false)
    private boolean isApproved = false;

    // 포트원 본인인증 고유 번호
    @Column(length = 100)
    private String portoneImpUid;

    // 개인 계좌 정보
    @Column(length = 50)
    private String bankName;

    @Column(length = 50)
    private String accountNumber;

    @Column(length = 50)
    private String accountHolder;

    // 알림 설정
    @Column(nullable = false)
    private boolean allowNotifications = true;

    @Builder
    public Member(String email, String password, String name, Role role,
                  Company company, String portoneImpUid) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.company = company;
        this.portoneImpUid = portoneImpUid;

        if (role == Role.ROLE_INTEGRATED_ADMIN) {
            this.isApproved = true;
        } else if (role == Role.ROLE_COMPANY_ADMIN) {
            this.isApproved = false;
        } else if (role == Role.ROLE_COMPANY_USER) {
            this.isApproved = false;
        } else {
            this.isApproved = true;
        }
    }

    public enum Role {
        ROLE_USER,
        ROLE_COMPANY_USER,
        ROLE_COMPANY_ADMIN,
        ROLE_INTEGRATED_ADMIN
    }

    public void enableMfa() {
        this.mfaEnabled = true;
    }

    public void updateTotpSecret(String secret) {
        this.totpSecret = secret;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public void approveCompany() {
        this.isApproved = true;
    }

    public void revokeCompany() {
        this.isApproved = false;
        this.company = null;
    }

    public void disableMfa() {
        this.mfaEnabled = false;
        this.totpSecret = null;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void updateAccountInfo(String bankName, String accountNumber, String accountHolder) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
    }

    public void updateNotificationSettings(boolean allowNotifications) {
        this.allowNotifications = allowNotifications;
    }

    // 하위 호환용 헬퍼 메서드
    public String getBusinessNumber() {
        return company != null ? company.getBusinessNumber() : null;
    }

    public AdminApprovalStatus getAdminApprovalStatus() {
        return company != null ? company.getAdminApprovalStatus() : null;
    }
}
