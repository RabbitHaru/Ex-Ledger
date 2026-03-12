package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.member.entity.Member;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String email;
    private String name;
    private String role;
    private boolean isApproved;
    private String businessNumber;
    private String bankName;
    private String accountNumber;
    private String accountHolder;
    private boolean allowNotifications;
    private boolean mfaEnabled;
    private String adminApprovalStatus;
    private String companyName;
    private java.time.LocalDateTime mfaResetAt;
    private java.time.LocalDateTime mfaCooldownEnd;
    private String realName;
    private java.time.LocalDateTime withdrawalRequestedAt;

    public static UserProfileResponse from(Member member) {
        java.time.LocalDateTime cooldownEnd = null;
        if (member.getMfaResetAt() != null) {
            cooldownEnd = member.getMfaResetAt().plusHours(24);
        }

        return UserProfileResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .role(member.getRole().name())
                .isApproved(member.isApproved())
                .adminApprovalStatus(member.getCompany() != null && member.getCompany().getAdminApprovalStatus() != null ? member.getCompany().getAdminApprovalStatus().name() : null)
                .companyName(member.getCompany() != null ? member.getCompany().getCompanyName() : null)
                .businessNumber(member.getCompany() != null ? member.getCompany().getBusinessNumber() : null)
                .bankName(member.getBankName())
                .accountNumber(member.getAccountNumber())
                .accountHolder(member.getAccountHolder())
                .allowNotifications(member.isAllowNotifications())
                .mfaEnabled(member.isMfaEnabled())
                .mfaResetAt(member.getMfaResetAt())
                .mfaCooldownEnd(cooldownEnd)
                .realName(member.getRealName())
                .withdrawalRequestedAt(member.getWithdrawalRequestedAt())
                .build();
    }
}
