package me.projectexledger.domain.member.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.wallet.entity.Wallet;
import me.projectexledger.common.config.AesCryptoConverter; // 🌟 B담당 암호화 컨버터

import java.time.LocalDateTime;

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
    @JsonIgnore // 🌟 보안 및 순환 참조 방지
    private String password;

    @Convert(converter = AesCryptoConverter.class) // 🌟 B담당 보안 적용
    @Column(length = 255)
    private String name;

    @Convert(converter = AesCryptoConverter.class) // 🌟 실명 정보 보안 강화
    @Column(length = 255)
    private String realName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean mfaEnabled = false;

    @Convert(converter = AesCryptoConverter.class) // 🌟 TOTP 키 암호화 저장
    @Column(length = 255)
    private String totpSecret;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    // 🌟 C담당 지갑 분리 구조 (1:1 관계)
    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private Wallet wallet;

    @Column(nullable = false)
    private boolean isApproved = false;

    @Column(nullable = false)
    private boolean allowNotifications = true;

    // 🌟 B담당 회원 상태 관리 필드
    private LocalDateTime withdrawalRequestedAt; // 탈퇴 유예 기간 추적
    private LocalDateTime mfaResetAt;           // MFA 쿨다운 추적

    @Builder
    public Member(String email, String password, String name, Role role, Company company) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.realName = name; // 초기값 설정
        this.role = role;
        this.company = company;

        // B담당 승인 로직 반영
        if (role == Role.ROLE_INTEGRATED_ADMIN || role == Role.ROLE_USER) {
            this.isApproved = true;
        } else {
            this.isApproved = false;
        }
    }

    public enum Role {
        ROLE_USER, ROLE_COMPANY_USER, ROLE_COMPANY_ADMIN, ROLE_INTEGRATED_ADMIN
    }

    /**
     * 지갑 객체 접근 (C담당 구조)
     */
    public Wallet getOrCreateWallet() {
        if (this.wallet == null) {
            this.wallet = Wallet.builder().member(this).build();
        }
        return this.wallet;
    }

    // --- 업데이트 및 상태 관리 메서드 ---

    public void updatePassword(String encodedPassword) { this.password = encodedPassword; }

    public void enableMfa() { this.mfaEnabled = true; }

    public void disableMfa() {
        this.mfaEnabled = false;
        this.totpSecret = null;
    }

    public void updateTotpSecret(String secret) { this.totpSecret = secret; }

    public void updateRealName(String realName) { this.realName = realName; }

    public void recordMfaReset() { this.mfaResetAt = LocalDateTime.now(); }

    public void updateNotificationSettings(boolean allowNotifications) {
        this.allowNotifications = allowNotifications;
    }

    // 🌟 지갑 정보 업데이트를 Wallet 엔티티로 위임 (C담당 구조)
    public void updateAccountInfo(String bankName, String accountNumber, String accountHolder) {
        this.getOrCreateWallet().updateAccountInfo(bankName, accountNumber, accountHolder);
    }

    // 🌟 회원 탈퇴 유예 로직 (B담당)
    public void requestWithdrawal() { this.withdrawalRequestedAt = LocalDateTime.now(); }
    public void cancelWithdrawal() { this.withdrawalRequestedAt = null; }
    public boolean isWithdrawalPending() { return this.withdrawalRequestedAt != null; }

    public void approveCompany() { this.isApproved = true; }

    public void revokeCompany() {
        this.isApproved = false;
        this.company = null;
    }

    public void setCompany(Company company) { this.company = company; }

    public void updateRole(Role role) {
        this.role = role;
    }

    public void setApproved(boolean isApproved) {
        this.isApproved = isApproved;
    }

    // 헬퍼 메서드
    public AdminApprovalStatus getAdminApprovalStatus() {
        return (company != null) ? company.getAdminApprovalStatus() : null;
    }

    public String getBusinessNumber() {
        return (company != null) ? company.getBusinessNumber() : null;
    }
}