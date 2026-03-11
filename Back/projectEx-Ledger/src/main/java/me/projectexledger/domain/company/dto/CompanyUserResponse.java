package me.projectexledger.domain.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import me.projectexledger.domain.member.entity.Member;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyUserResponse {
    private Long id;
    private String email;
    private String name;
    private String role;
    private boolean isApproved;

    public static CompanyUserResponse from(Member member) {
        return CompanyUserResponse.builder()
                .id(member.getId())
                .email(member.getEmail())
                .name(member.getName())
                .role(member.getRole().name())
                .isApproved(member.isApproved())
                .build();
    }
}
