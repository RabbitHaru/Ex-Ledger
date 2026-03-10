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

    // 포트원 본인인증 고유 번호 (결제내역/인증내역 검증용)
    @Column(length = 100)
    private String portoneImpUid;

    // 비공개 파일 스토리지 식별용 UUID
    @Column(length = 100)
    private String licenseFileUuid;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AdminApprovalStatus adminApprovalStatus;

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
    public Member(String email, String password, String name, Role role, String businessNumber, String portoneImpUid,
            String licenseFileUuid) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.businessNumber = businessNumber;
        this.portoneImpUid = portoneImpUid;
        this.licenseFileUuid = licenseFileUuid;

        if (role == Role.ROLE_INTEGRATED_ADMIN) {
            this.isApproved = true;
            this.adminApprovalStatus = AdminApprovalStatus.APPROVED;
        } else if (role == Role.ROLE_COMPANY_ADMIN) {
            // 기업 관리자는 최고 관리자의 승인을 받아야 함
            this.isApproved = false;
            this.adminApprovalStatus = AdminApprovalStatus.PENDING;
        } else if (role == Role.ROLE_COMPANY_USER) {
            // 기업 회원은 사내 관리자의 승인을 받아야 함
            this.isApproved = false;
        } else {
            // 일반 유저는 기업 승인이 필요 없음 (가입 즉시 활동 가능)
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

    public void requestCompanyApproval(String businessNumber) {
        this.businessNumber = businessNumber;
        this.isApproved = false; // 재요청 시 다시 미승인 대기 상태로
    }

    public void approveCompany() {
        this.isApproved = true;
    }

    public void disableMfa() {
        this.mfaEnabled = false;
        this.totpSecret = null;
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void approveByAdmin() {
        this.isApproved = true;
        this.adminApprovalStatus = AdminApprovalStatus.APPROVED;
    }

    public void rejectByAdmin() {
        this.isApproved = false;
        this.adminApprovalStatus = AdminApprovalStatus.REJECTED;
    }

    public void updateAccountInfo(String bankName, String accountNumber, String accountHolder) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
    }

    public void updateNotificationSettings(boolean allowNotifications) {
        this.allowNotifications = allowNotifications;
    }
}
