package me.projectexledger.domain.company.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;
import me.projectexledger.common.config.AesCryptoConverter;

/**
 * 기업 엔티티 — 사업자 단위의 정보를 관리
 */
@Entity
@Table(name = "company")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Company extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Convert(converter = AesCryptoConverter.class)
    @Column(nullable = false, unique = true, length = 255)
    private String businessNumber;

    @Column(length = 100)
    private String companyName;

    @Convert(converter = AesCryptoConverter.class)
    @Column(length = 255)
    private String representative;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AdminApprovalStatus adminApprovalStatus;

    @Column(length = 100)
    private String licenseFileUuid;

    @Column(length = 50)
    private String corporateAccountNumber;

    @Column(name = "balance_krw")
    private Long balanceKrw = 0L;

    @Column(name = "balance_usd", precision = 15, scale = 2)
    private BigDecimal balanceUsd = BigDecimal.ZERO;

    @Column(name = "balance_eur", precision = 15, scale = 2)
    private BigDecimal balanceEur = BigDecimal.ZERO;

    @Column(name = "balance_jpy", precision = 15, scale = 2)
    private BigDecimal balanceJpy = BigDecimal.ZERO;

    @Builder
    public Company(String businessNumber, String companyName, String representative,
                   AdminApprovalStatus adminApprovalStatus, String licenseFileUuid) {
        this.businessNumber = businessNumber;
        this.companyName = companyName;
        this.representative = representative;
        this.adminApprovalStatus = adminApprovalStatus != null ? adminApprovalStatus : AdminApprovalStatus.PENDING;
        this.licenseFileUuid = licenseFileUuid;
        // balanceKrw is initialized by field declaration
    }

    public void activateAccount(String accountNumber) {
        this.corporateAccountNumber = accountNumber;
        this.adminApprovalStatus = AdminApprovalStatus.APPROVED;
    }

    public void addBalance(Long amount) {
        this.balanceKrw += amount;
    }

    public void deductBalance(Long amount) {
        if (this.balanceKrw < amount) {
            throw new IllegalArgumentException("기업 잔액이 부족합니다.");
        }
        this.balanceKrw -= amount;
    }

    public void addForeignBalance(String currency, BigDecimal amount) {
        if ("USD".equals(currency)) {
            this.balanceUsd = (this.balanceUsd != null ? this.balanceUsd : BigDecimal.ZERO).add(amount);
        } else if ("EUR".equals(currency)) {
            this.balanceEur = (this.balanceEur != null ? this.balanceEur : BigDecimal.ZERO).add(amount);
        } else if ("JPY".equals(currency)) {
            this.balanceJpy = (this.balanceJpy != null ? this.balanceJpy : BigDecimal.ZERO).add(amount);
        } else {
            throw new IllegalArgumentException("지원하지 않는 외화입니다.");
        }
    }

    public void deductForeignBalance(String currency, BigDecimal amount) {
        if ("USD".equals(currency)) {
            if (this.balanceUsd == null || this.balanceUsd.compareTo(amount) < 0) throw new IllegalArgumentException("기업 USD 잔액이 부족합니다.");
            this.balanceUsd = this.balanceUsd.subtract(amount);
        } else if ("EUR".equals(currency)) {
            if (this.balanceEur == null || this.balanceEur.compareTo(amount) < 0) throw new IllegalArgumentException("기업 EUR 잔액이 부족합니다.");
            this.balanceEur = this.balanceEur.subtract(amount);
        } else if ("JPY".equals(currency)) {
            if (this.balanceJpy == null || this.balanceJpy.compareTo(amount) < 0) throw new IllegalArgumentException("기업 JPY 잔액이 부족합니다.");
            this.balanceJpy = this.balanceJpy.subtract(amount);
        } else {
            throw new IllegalArgumentException("지원하지 않는 외화입니다.");
        }
    }

    public void approveByAdmin() {
        this.adminApprovalStatus = AdminApprovalStatus.APPROVED;
    }

    public void rejectByAdmin() {
        this.adminApprovalStatus = AdminApprovalStatus.REJECTED;
    }

    public void updateLicenseFile(String licenseFileUuid) {
        this.licenseFileUuid = licenseFileUuid;
    }

    /**
     * 반려 후 재제출: 사업자등록증을 보완하여 다시 심사 요청
     */
    public void resubmitForReview(String newLicenseFileUuid) {
        if (this.adminApprovalStatus != AdminApprovalStatus.REJECTED) {
            throw new IllegalStateException("반려 상태의 기업만 재제출할 수 있습니다.");
        }
        this.licenseFileUuid = newLicenseFileUuid;
        this.adminApprovalStatus = AdminApprovalStatus.PENDING;
    }

    public void updateInfo(String companyName, String representative) {
        if (companyName != null) this.companyName = companyName;
        if (representative != null) this.representative = representative;
    }
}