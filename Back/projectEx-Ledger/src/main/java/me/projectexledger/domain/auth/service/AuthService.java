package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.auth.dto.MfaLoginRequest;
import me.projectexledger.domain.auth.dto.MfaSetupResponse;
import me.projectexledger.domain.auth.dto.MfaVerifyRequest;
import me.projectexledger.domain.auth.dto.LoginRequest;
import me.projectexledger.domain.auth.dto.SignupRequest;
import me.projectexledger.domain.auth.dto.TokenResponse;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.security.JwtTokenProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final TurnstileService turnstileService;
    private final GoogleAuthenticator googleAuthenticator;

    @Transactional
    public Long signup(SignupRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다. 봇이 아님을 확인해주세요.");
        }

        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }

        Member.Role role = "COMPANY_ADMIN".equals(request.getRoleType()) ? Member.Role.ROLE_COMPANY_ADMIN
                : Member.Role.ROLE_USER;

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .businessNumber(request.getBusinessNumber())
                .build();

        return memberRepository.save(member).getId();
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다. 봇이 아님을 확인해주세요.");
        }

        // 1. 이메일/비밀번호 기반으로 Authentication 토큰 생성
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                request.getEmail(), request.getPassword());

        // 2. 실제 검증 (사용자 비밀번호 체크 등) - CustomUserDetailsService의 loadUserByUsername 실행됨
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 모든 사용자에게 예외 없이 MFA 검증 및 설정 강제
        if (!member.isMfaEnabled()) {
            // 아직 설정을 안 했다면, frontend가 setupMfa를 호출하도록 유도
            return new TokenResponse(null, "Bearer", false, true);
        }

        // 설정이 되어 있다면 OTP 코드 입력 단계로 이동
        return new TokenResponse(null, "Bearer", true, false);
    }

    @Transactional
    public TokenResponse loginWithMfa(MfaLoginRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다. 봇이 아님을 확인해주세요.");
        }

        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                request.getEmail(), request.getPassword());
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!member.isMfaEnabled()) {
            throw new IllegalArgumentException("MFA가 활성화되어 있지 않습니다.");
        }

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), request.getCode());
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        String jwt = jwtTokenProvider.createToken(authentication);
        return new TokenResponse(jwt, "Bearer", false, false);
    }

    @Transactional
    public MfaSetupResponse setupMfa(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.isMfaEnabled()) {
            throw new IllegalArgumentException("이미 MFA가 활성화되어 있습니다.");
        }

        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.updateTotpSecret(key.getKey());

        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.isMfaEnabled()) {
            throw new IllegalArgumentException("이미 MFA가 활성화되어 있습니다.");
        }

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), request.getCode());
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        member.enableMfa();
    }
}
