package me.projectexledger.domain.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import me.projectexledger.domain.member.entity.Member;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class AdminMemberResponse {
    private Long id;
    private String email;
    private String name;
    private Member.Role role;
    @com.fasterxml.jackson.annotation.JsonProperty("isApproved")
    private boolean isApproved;
    private String companyName;
    private String businessNumber;
    private LocalDateTime createdAt;
    private boolean mfaEnabled;

    public static AdminMemberResponse from(Member member) {
        return AdminMemberResponse.builder()
                .id(member.getId())
                .email(member.getEmail())
                .name(member.getName())
                .role(member.getRole())
                .isApproved(member.isApproved())
                .companyName(member.getCompany() != null ? member.getCompany().getCompanyName() : null)
                .businessNumber(member.getCompany() != null ? member.getCompany().getBusinessNumber() : null)
                .createdAt(member.getCreatedAt())
                .mfaEnabled(member.isMfaEnabled())
                .build();
    }
}
