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
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import java.util.Map;
import java.time.Duration;
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
    private final RedisTemplate<String, Object> redisTemplate;
    private final PortOneVerificationService portOneVerificationService;

    @Transactional
    public Long signup(SignupRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다.");
        }

        // 포트원 본인인증 검증
        if (request.getPortoneImpUid() != null) {
            Map<String, Object> verification = portOneVerificationService
                    .getIdentityVerification(request.getPortoneImpUid());
            // 실명 일치 여부 확인 (Optional)
            String verifiedName = (String) verification.get("verifiedName");
            if (verifiedName != null && !verifiedName.equals(request.getName())) {
                throw new IllegalArgumentException("본인인증된 이름과 입력하신 이름이 일치하지 않습니다.");
            }
        } else if (!"INTEGRATED_ADMIN".equals(request.getRoleType())) {
            // 관리자 외에는 본인인증 필수 (필요시 활성)
            // throw new IllegalArgumentException("본인인증이 필요합니다.");
        }

        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }

        Member.Role role;
        if ("COMPANY_ADMIN".equals(request.getRoleType())) {
            role = Member.Role.ROLE_COMPANY_ADMIN;
        } else if ("COMPANY_USER".equals(request.getRoleType())) {
            role = Member.Role.ROLE_COMPANY_USER;
        } else {
            role = Member.Role.ROLE_USER;
        }

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .businessNumber(request.getBusinessNumber())
                .portoneImpUid(request.getPortoneImpUid())
                .licenseFileUuid(request.getLicenseFileUuid())
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

        String jwt = jwtTokenProvider.createToken(authentication);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication);

        redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
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
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication);

        redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token 입니다. 다시 로그인해주세요.");
        }

        String email = jwtTokenProvider.getSubjectFromToken(refreshToken);

        String savedToken = (String) redisTemplate.opsForValue().get("RT:" + email);
        if (savedToken == null || !savedToken.equals(refreshToken)) {
            throw new IllegalArgumentException("로그아웃 되었거나 무효화된 토큰입니다. 다시 로그인해주세요.");
        }

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Authentication authentication = new UsernamePasswordAuthenticationToken(email, null,
                List.of(new SimpleGrantedAuthority(member.getRole().name())));

        String newAccessToken = jwtTokenProvider.createToken(authentication);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(authentication);

        redisTemplate.opsForValue().set("RT:" + email, newRefreshToken, Duration.ofDays(7));

        return new TokenResponse(newAccessToken, newRefreshToken, "Bearer", false, false);
    }

    @Transactional
    public MfaSetupResponse setupMfa(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 재발급(reset) 시에도 사용 가능하도록 수정
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.updateTotpSecret(key.getKey());

        // MFA가 이미 활성화되어 있었다면, 새로운 키 등록 전까지는 유효하도록 둘 수도 있지만
        // 여기서는 즉시 비활성화 후 재등록 유도
        member.disableMfa();

        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), request.getCode());
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        member.enableMfa();
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!passwordEncoder.matches(currentPassword, member.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        member.updatePassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public void updateAccountInfo(String email, String bankName, String accountNumber, String accountHolder) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        member.updateAccountInfo(bankName, accountNumber, accountHolder);
    }

    @Transactional
    public void updateNotificationSettings(String email, boolean allowNotifications) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        member.updateNotificationSettings(allowNotifications);
    }
}
