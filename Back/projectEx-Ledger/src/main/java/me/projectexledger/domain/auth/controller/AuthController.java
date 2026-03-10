package me.projectexledger.domain.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.auth.dto.LoginRequest;
import me.projectexledger.domain.auth.dto.SignupRequest;
import me.projectexledger.domain.auth.dto.TokenResponse;
import me.projectexledger.domain.auth.service.AuthService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import me.projectexledger.domain.auth.dto.MfaLoginRequest;
import me.projectexledger.domain.auth.dto.MfaSetupResponse;
import me.projectexledger.domain.auth.service.BusinessVerificationService;
import me.projectexledger.common.annotation.RequireMfa;
import org.springframework.web.bind.annotation.GetMapping;
import java.security.Principal;
import java.util.Map;
import me.projectexledger.domain.auth.dto.TokenRefreshRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ApiResponse<Long> signup(@Valid @RequestBody SignupRequest request) {
        Long memberId = authService.signup(request);
        return ApiResponse.success("회원가입이 완료되었습니다.", memberId);
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokenResponse = authService.login(request);
        return ApiResponse.success("로그인 성공", tokenResponse);
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
    public ApiResponse<MfaSetupResponse> setupMfa(Principal principal) {
        if (principal == null) {
            return ApiResponse.fail("로그인이 필요합니다.");
        }
        MfaSetupResponse response = authService.setupMfa(principal.getName());
        return ApiResponse.success("MFA 설정 준비 완료 (기존 설정은 초기화되었습니다)", response);
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
}
