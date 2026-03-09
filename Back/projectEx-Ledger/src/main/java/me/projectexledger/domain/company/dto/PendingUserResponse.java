package me.projectexledger.domain.company.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import me.projectexledger.domain.member.entity.Member;

@Getter
@AllArgsConstructor
public class PendingUserResponse {
    private Long id;
    private String email;
    private String name;
    private String businessNumber;

    public static PendingUserResponse from(Member member) {
        return new PendingUserResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getBusinessNumber());
    }
}
