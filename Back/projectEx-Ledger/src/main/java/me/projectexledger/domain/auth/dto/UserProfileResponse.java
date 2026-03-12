package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.wallet.entity.Wallet;
import me.projectexledger.domain.company.entity.Company;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String email;
    private String name;
    private String realName;
    private String role;
    private boolean isApproved;
    private String companyName;
    private String businessNumber;

    // 🌟 C담당 구조: Wallet 엔티티에서 관리되는 계좌 정보
    private String bankName;
    private String accountNumber;
    private String accountHolder;

    private boolean allowNotifications;
    private boolean mfaEnabled;
    private String adminApprovalStatus;

    // 🌟 B담당 추가: MFA 및 계정 상태 정보
    private LocalDateTime mfaResetAt;
    private LocalDateTime mfaCooldownEnd;
    private LocalDateTime withdrawalRequestedAt;

    public static UserProfileResponse from(Member member) {
        // 1. 지갑 정보 (C담당 구조: 분리된 엔티티 참조)
        Wallet wallet = member.getWallet();

        // 2. 기업 정보 (B담당 구조: Company 엔티티 참조)
        Company company = member.getCompany();

        // 3. MFA 쿨다운 계산 (재설정 시점부터 24시간)
        LocalDateTime cooldownEnd = null;
        if (member.getMfaResetAt() != null) {
            cooldownEnd = member.getMfaResetAt().plusHours(24);
        }

        return UserProfileResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .realName(member.getRealName())
                .role(member.getRole().name())
                .isApproved(member.isApproved())

                // 기업 정보 매핑 (B담당의 Company 기반 매핑)
                .companyName(company != null ? company.getCompanyName() : null)
                .businessNumber(company != null ? company.getBusinessNumber() : null)
                .adminApprovalStatus(company != null && company.getAdminApprovalStatus() != null
                        ? company.getAdminApprovalStatus().name() : null)

                // 계좌 정보 매핑 (C담당의 Wallet 기반 매핑)
                .bankName(wallet != null ? wallet.getBankName() : null)
                .accountNumber(wallet != null ? wallet.getAccountNumber() : null)
                .accountHolder(wallet != null ? wallet.getAccountHolder() : null)

                .allowNotifications(member.isAllowNotifications())
                .mfaEnabled(member.isMfaEnabled())

                // 계정 상태 정보
                .mfaResetAt(member.getMfaResetAt())
                .mfaCooldownEnd(cooldownEnd)
                .withdrawalRequestedAt(member.getWithdrawalRequestedAt())
                .build();
    }
}