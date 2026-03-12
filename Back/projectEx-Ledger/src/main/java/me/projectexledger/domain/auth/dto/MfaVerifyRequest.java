package me.projectexledger.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MfaVerifyRequest {
    private String email;
    private String code;
}
