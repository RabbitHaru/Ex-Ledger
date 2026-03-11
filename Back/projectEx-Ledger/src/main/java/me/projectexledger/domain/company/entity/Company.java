package me.projectexledger.domain.company.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
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

    @Builder
    public Company(String businessNumber, String companyName, String representative,
                   AdminApprovalStatus adminApprovalStatus, String licenseFileUuid) {
        this.businessNumber = businessNumber;
        this.companyName = companyName;
        this.representative = representative;
        this.adminApprovalStatus = adminApprovalStatus != null ? adminApprovalStatus : AdminApprovalStatus.PENDING;
        this.licenseFileUuid = licenseFileUuid;
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
