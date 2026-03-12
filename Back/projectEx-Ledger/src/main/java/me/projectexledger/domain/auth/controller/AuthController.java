package me.projectexledger.domain.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.auth.dto.LoginRequest;
import me.projectexledger.domain.auth.dto.SignupRequest;
import me.projectexledger.domain.auth.dto.TokenResponse;
import me.projectexledger.domain.auth.service.AuthService;
import me.projectexledger.domain.auth.service.BusinessVerificationService;
import me.projectexledger.domain.auth.dto.BusinessVerificationResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import me.projectexledger.domain.auth.dto.MfaLoginRequest;
import me.projectexledger.domain.auth.dto.MfaSetupResponse;
import me.projectexledger.common.annotation.RequireMfa;
import me.projectexledger.common.annotation.RequireCompanyApproval;
import java.security.Principal;
import java.util.Map;
import me.projectexledger.domain.auth.dto.TokenRefreshRequest;
import me.projectexledger.domain.auth.dto.MfaSessionResponse;
import me.projectexledger.domain.auth.dto.UserProfileResponse;
import me.projectexledger.domain.auth.dto.MfaVerifyRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final BusinessVerificationService businessVerificationService;

    @PostMapping("/signup")
    public ApiResponse<TokenResponse> signup(@Valid @RequestBody SignupRequest request) {
        TokenResponse tokenResponse = authService.signup(request);
        return ApiResponse.success("회원가입이 완료되었습니다.", tokenResponse);
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokenResponse = authService.login(request);
        return ApiResponse.success("로그인 성공", tokenResponse);
    }

    @PostMapping("/verify-business")
    public ApiResponse<BusinessVerificationResponse> verifyBusiness(@RequestBody Map<String, String> request) {
        String businessNumber = request.get("businessNumber");
        if (businessNumber == null || businessNumber.isEmpty()) {
            return ApiResponse.fail("사업자 등록번호를 입력해주세요.");
        }
        BusinessVerificationResponse response = businessVerificationService.verify(businessNumber);
        if (response.isValid()) {
            return ApiResponse.success(response.getMessage(), response);
        } else {
            return ApiResponse.fail(response.getMessage());
        }
    }

    @GetMapping("/check-email")
    public ApiResponse<Void> checkEmail(@jakarta.validation.constraints.Email String email) {
        authService.checkEmailAvailability(email);
        return ApiResponse.success("사용 가능한 이메일입니다.", null);
    }

    @PostMapping("/login/mfa")
    public ApiResponse<TokenResponse> loginWithMfa(@Valid @RequestBody MfaLoginRequest request) {
        TokenResponse tokenResponse = authService.loginWithMfa(request);
        return ApiResponse.success("MFA 로그인 성공", tokenResponse);
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        TokenResponse tokenResponse = authService.refreshToken(request.getRefreshToken());
        return ApiResponse.success("토큰 재발급 성공", tokenResponse);
    }

    @PostMapping("/mfa/setup")
    public ApiResponse<MfaSetupResponse> setupMfa(Principal principal, @RequestBody(required = false) Map<String, Object> body) {
        if (principal == null) {
            throw new IllegalArgumentException("MFA_SETUP_LOGIN_REQUIRED: 로그인이 필요합니다.");
        }
        Integer currentOtpCode = null;
        if (body != null && body.get("currentOtpCode") != null) {
            try {
                currentOtpCode = Integer.valueOf(body.get("currentOtpCode").toString());
            } catch (NumberFormatException e) {
                return ApiResponse.fail("기존 OTP 코드가 올바르지 않은 형식입니다 (숫자 6자리).");
            }
        }
        MfaSetupResponse response = authService.setupMfa(principal.getName(), currentOtpCode);
        return ApiResponse.success("MFA 설정 준비 완료 (기존 설정은 초기화되었습니다)", response);
    }

    @PostMapping("/mfa/setup-registration")
    public ApiResponse<MfaSetupResponse> setupRegistrationMfa(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("이메일 정보가 누락되었습니다.");
        }
        MfaSetupResponse response = authService.generateRegistrationMfa(email);
        return ApiResponse.success("회원가입 MFA 설정 정보 생성", response);
    }

    /**
     * OTP 분실 시 본인인증을 통한 MFA 초기화
     * PortOne 본인인증 imp_uid를 받아 가입 시 저장된 값과 대조
     */
    @PostMapping("/mfa/reset-by-identity")
    public ApiResponse<MfaSetupResponse> resetMfaByIdentity(Principal principal, @RequestBody Map<String, String> body) {
        if (principal == null) {
            return ApiResponse.fail("로그인이 필요합니다.");
        }
        String impUid = body.get("impUid");
        if (impUid == null || impUid.isBlank()) {
            return ApiResponse.fail("본인인증 정보가 필요합니다.");
        }
        MfaSetupResponse response = authService.resetMfaByIdentity(principal.getName(), impUid);
        return ApiResponse.success("본인인증 확인 완료. OTP가 초기화되었습니다.", response);
    }

    @PostMapping("/mfa/enable")
    public ApiResponse<Void> enableMfa(Principal principal, @RequestBody MfaVerifyRequest request) {
        String email = (principal != null) ? principal.getName() : request.getEmail();
        if (email == null || email.isEmpty()) {
            return ApiResponse.fail("이메일 정보가 누락되었습니다.");
        }
        authService.enableMfa(email, request);
        return ApiResponse.success("MFA가 성공적으로 활성화되었습니다.", null);
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(Principal principal, @RequestBody Map<String, String> body) {
        if (principal == null)
            return ApiResponse.fail("로그인이 필요합니다.");
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ApiResponse.fail("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
        }

        try {
            authService.changePassword(principal.getName(), currentPassword, newPassword);
            return ApiResponse.success("비밀번호가 성공적으로 변경되었습니다.", null);
        } catch (Exception e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/update-account")
    @RequireCompanyApproval
    public ApiResponse<Void> updateAccountInfo(Principal principal, @RequestBody Map<String, String> body) {
        if (principal == null)
            return ApiResponse.fail("로그인이 필요합니다.");

        authService.updateAccountInfo(principal.getName(),
                body.get("bankName"),
                body.get("accountNumber"),
                body.get("accountHolder"));
        return ApiResponse.success("계좌 정보가 업데이트되었습니다.", null);
    }

    @PostMapping("/update-noti")
    public ApiResponse<Void> updateNotiSettings(Principal principal, @RequestBody Map<String, Boolean> body) {
        if (principal == null)
            return ApiResponse.fail("로그인이 필요합니다.");

        Boolean allowNotifications = body.get("allowNotifications");
        if (allowNotifications == null)
            allowNotifications = false;

        authService.updateNotificationSettings(principal.getName(), allowNotifications);
        return ApiResponse.success("알림 설정이 업데이트되었습니다.", null);
    }

    @RequireMfa
    @GetMapping("/test-mfa")
    public ApiResponse<String> testMfaEndpoint(Principal principal) {
        return ApiResponse.success("MFA 인증을 무사히 통과했습니다! 사용자: " + principal.getName(), null);
    }

    @GetMapping("/mfa/session")
    public ApiResponse<MfaSessionResponse> getMfaSession(Principal principal) {
        if (principal == null) return ApiResponse.fail("로그인이 필요합니다.");
        MfaSessionResponse response = authService.getMfaSessionTtl(principal.getName());
        return ApiResponse.success("MFA 세션 정보 조회 성공", response);
    }

    @PostMapping("/mfa/session/extend")
    public ApiResponse<Void> extendMfaSession(Principal principal) {
        if (principal == null) return ApiResponse.fail("로그인이 필요합니다.");
        authService.extendMfaSession(principal.getName());
        return ApiResponse.success("MFA 세션이 연장되었습니다.", null);
    }

    @GetMapping("/me")
    public ApiResponse<UserProfileResponse> getMyProfile(Principal principal) {
        if (principal == null) return ApiResponse.fail("로그인이 필요합니다.");
        UserProfileResponse response = authService.getMyProfile(principal.getName());
        return ApiResponse.success("내 프로필 정보 조회 성공", response);
    }

    @DeleteMapping("/withdraw")
    public ApiResponse<Void> withdraw(Principal principal) {
        if (principal == null) return ApiResponse.fail("로그인이 필요합니다.");
        authService.withdraw(principal.getName());
        return ApiResponse.success("회원 탈퇴 요청이 접수되었습니다. 7일 이내에 다시 로그인하여 철회할 수 있습니다.", null);
    }

    @PostMapping("/withdraw/cancel")
    public ApiResponse<Void> cancelWithdraw(Principal principal) {
        if (principal == null) return ApiResponse.fail("로그인이 필요합니다.");
        authService.cancelWithdrawal(principal.getName());
        return ApiResponse.success("회원 탈퇴 요청이 철회되었습니다.", null);
    }
}
