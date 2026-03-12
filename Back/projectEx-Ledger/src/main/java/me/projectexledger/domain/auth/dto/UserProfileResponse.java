package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.wallet.entity.Wallet;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String email;
    private String name;
    private String realName; // 🌟 B담당 추가: 실명 정보
    private String role;
    private boolean isApproved;
    private String businessNumber;

    // 🌟 C담당 구조: Wallet 엔티티에서 가져오는 계좌 정보
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
        // 1. 지갑 정보 안전하게 가져오기 (C담당 구조)
        Wallet wallet = member.getWallet();

        // 2. MFA 쿨다운 계산 (B담당 로직: 재설정 후 24시간)
        LocalDateTime cooldownEnd = null;
        if (member.getMfaResetAt() != null) {
            cooldownEnd = member.getMfaResetAt().plusHours(24);
        }

        return UserProfileResponse.builder()
                .email(member.getEmail())
                .name(member.getName())
                .realName(member.getRealName()) // 🌟 B담당 필드
                .role(member.getRole().name())
                .isApproved(member.isApproved())
                .adminApprovalStatus(member.getAdminApprovalStatus() != null ? member.getAdminApprovalStatus().name() : null)
                .businessNumber(member.getBusinessNumber())

                // 🌟 Wallet 엔티티에서 계좌 정보 매핑 (C담당 구조)
                .bankName(wallet != null ? wallet.getBankName() : null)
                .accountNumber(wallet != null ? wallet.getAccountNumber() : null)
                .accountHolder(wallet != null ? wallet.getAccountHolder() : null)

                .allowNotifications(member.isAllowNotifications())
                .mfaEnabled(member.isMfaEnabled())

                // 🌟 계정 상태 필드 매핑 (B담당 필드)
                .mfaResetAt(member.getMfaResetAt())
                .mfaCooldownEnd(cooldownEnd)
                .withdrawalRequestedAt(member.getWithdrawalRequestedAt())
                .build();
    }
}