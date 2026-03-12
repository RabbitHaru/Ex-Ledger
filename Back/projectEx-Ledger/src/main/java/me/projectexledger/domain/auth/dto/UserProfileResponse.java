package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.wallet.entity.Wallet;

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
        Wallet wallet = member.getWallet();
        return UserProfileResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .role(member.getRole().name())
                .isApproved(member.isApproved())
                .adminApprovalStatus(member.getAdminApprovalStatus() != null ? member.getAdminApprovalStatus().name() : null)
                .businessNumber(member.getBusinessNumber())
                .bankName(wallet != null ? wallet.getBankName() : null)
                .accountNumber(wallet != null ? wallet.getAccountNumber() : null)
                .accountHolder(wallet != null ? wallet.getAccountHolder() : null)
                .allowNotifications(member.isAllowNotifications())
                .mfaEnabled(member.isMfaEnabled())
                .build();
    }
}