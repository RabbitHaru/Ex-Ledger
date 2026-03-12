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
    @JsonIgnore // 보안 및 순환 참조 방지
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

    // 🌟 Wallet 조회 시 Member를 다시 부르는 무한 루프 방지
    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private Wallet wallet;

    @Column(nullable = false)
    private boolean isApproved = false;

    @Column(nullable = false)
    private boolean allowNotifications = true;

    @Builder
    public Member(String email, String password, String name, Role role, Company company) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.role = role;
        this.company = company;
        this.isApproved = (role == Role.ROLE_INTEGRATED_ADMIN || role == Role.ROLE_USER);
    }

    public enum Role {
        ROLE_USER, ROLE_COMPANY_USER, ROLE_COMPANY_ADMIN, ROLE_INTEGRATED_ADMIN
    }

    public Wallet getOrCreateWallet() {
        if (this.wallet == null) {
            this.wallet = Wallet.builder().member(this).build();
        }
        return this.wallet;
    }

    public void updatePassword(String encodedPassword) { this.password = encodedPassword; }
    public void enableMfa() { this.mfaEnabled = true; }
    public void disableMfa() { this.mfaEnabled = false; this.totpSecret = null; }
    public void updateTotpSecret(String secret) { this.totpSecret = secret; }
    public void updateNotificationSettings(boolean allowNotifications) { this.allowNotifications = allowNotifications; }
    public void approveCompany() { this.isApproved = true; }
    public void revokeCompany() { this.isApproved = false; this.company = null; }
    public void setCompany(Company company) { this.company = company; }

    public AdminApprovalStatus getAdminApprovalStatus() {
        return (company != null) ? company.getAdminApprovalStatus() : null;
    }

    public String getBusinessNumber() {
        return (company != null) ? company.getBusinessNumber() : null;
    }
}