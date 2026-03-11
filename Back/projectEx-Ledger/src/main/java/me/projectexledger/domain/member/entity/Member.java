package me.projectexledger.domain.member.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;

/**
 * 사용자(회원) 엔티티: 인증, 보안, 지갑, 기업 관리 권한 로직을 통합 관리합니다.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false)
    private boolean isApproved = false;

    @Column(length = 100)
    private String portoneImpUid;

    @Column(length = 50)
    private String bankName;

    @Column(length = 50)
    private String accountNumber;

    @Column(length = 50)
    private String accountHolder;

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
        // 최고관리자와 일반 유저는 즉시 승인, 기업 관련 유저는 관리자 승인 대기 상태로 시작
        this.isApproved = (role == Role.ROLE_INTEGRATED_ADMIN || role == Role.ROLE_USER);
    }

    public enum Role {
        ROLE_USER, ROLE_COMPANY_USER, ROLE_COMPANY_ADMIN, ROLE_INTEGRATED_ADMIN
    }

    // [인증 및 보안 관련 메서드 - AuthService 연동]
    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void enableMfa() {
        this.mfaEnabled = true;
    }

    public void disableMfa() {
        this.mfaEnabled = false;
        this.totpSecret = null;
    }

    public void updateTotpSecret(String secret) {
        this.totpSecret = secret;
    }

    // [사용자 설정 및 계좌 관련 메서드 - AuthService 연동]
    public void updateAccountInfo(String bankName, String accountNumber, String accountHolder) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
    }

    public void updateNotificationSettings(boolean allowNotifications) {
        this.allowNotifications = allowNotifications;
    }

    // [기업 정보 및 프로필 연동 메서드 - UserProfileResponse 연동]
    public AdminApprovalStatus getAdminApprovalStatus() {
        return (company != null) ? company.getAdminApprovalStatus() : null;
    }

    public String getBusinessNumber() {
        return (company != null) ? company.getBusinessNumber() : null;
    }

    // [기업 멤버 승인 관리 메서드 - CompanyService 연동]
    public void approveCompany() {
        this.isApproved = true;
    }

    /**
     * 사용자의 기업 소속을 해제하고 승인 상태를 취소합니다.
     */
    public void revokeCompany() {
        this.isApproved = false;
        this.company = null;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    // [지갑 및 본인인증 관련 메서드 - WalletService 연동]
    public void updatePortOneInfo(String impUid) {
        this.portoneImpUid = impUid;
    }

    public void assignPersonalAccount(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getPersonalAccountNumber() {
        return this.accountNumber;
    }
}