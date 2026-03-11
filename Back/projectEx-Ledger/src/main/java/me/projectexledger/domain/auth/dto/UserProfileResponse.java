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

    public static UserProfileResponse from(Member member) {
        return UserProfileResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .role(member.getRole().name())
                .isApproved(member.isApproved())
                .adminApprovalStatus(member.getAdminApprovalStatus() != null ? member.getAdminApprovalStatus().name() : null)
                .businessNumber(member.getBusinessNumber())
                .bankName(member.getBankName())
                .accountNumber(member.getAccountNumber())
                .accountHolder(member.getAccountHolder())
                .allowNotifications(member.isAllowNotifications())
                .mfaEnabled(member.isMfaEnabled())
                .build();
    }
}
