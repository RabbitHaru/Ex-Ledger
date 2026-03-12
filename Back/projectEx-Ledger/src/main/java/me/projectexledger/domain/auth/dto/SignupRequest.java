package me.projectexledger.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignupRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Name is required")
    private String name;

    private String roleType; // "USER", "COMPANY_USER", or "COMPANY_ADMIN"
    private String businessNumber; // "1234567890" etc
    private String portoneImpUid; // 포트원 인증 고유 세션 ID
    private String licenseFileUuid; // 사업자등록증 파일 uuid (COMPANY_ADMIN 필수)
    private String turnstileToken;

    // MFA 설정을 위한 필드 (회원가입 동시 처리용)
    private String mfaSecret;
    private String mfaCode;
}
