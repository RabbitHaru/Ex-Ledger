package me.projectexledger.domain.company.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.BaseEntity;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;

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

    @Column(nullable = false, unique = true, length = 20)
    private String businessNumber;

    @Column(length = 100)
    private String companyName;

    @Column(length = 50)
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

    public void updateInfo(String companyName, String representative) {
        if (companyName != null) this.companyName = companyName;
        if (representative != null) this.representative = representative;
    }
}
