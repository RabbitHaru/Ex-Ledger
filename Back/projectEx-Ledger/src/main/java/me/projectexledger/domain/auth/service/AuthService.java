package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.auth.dto.MfaLoginRequest;
import me.projectexledger.domain.auth.dto.MfaSetupResponse;
import me.projectexledger.domain.auth.dto.MfaVerifyRequest;
import me.projectexledger.domain.auth.dto.MfaSessionResponse;
import me.projectexledger.domain.auth.dto.LoginRequest;
import me.projectexledger.domain.auth.dto.SignupRequest;
import me.projectexledger.domain.auth.dto.TokenResponse;
import me.projectexledger.domain.auth.dto.UserProfileResponse;
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

import me.projectexledger.domain.notification.service.SseEmitters;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;

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
    private final SseEmitters sseEmitters;
    private final CompanyRepository companyRepository;

    @Transactional
    public Long signup(SignupRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다.");
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

        Company company = null;
        if (role == Member.Role.ROLE_COMPANY_ADMIN && request.getBusinessNumber() != null) {
            company = companyRepository.findByBusinessNumber(request.getBusinessNumber())
                    .orElseGet(() -> companyRepository.save(Company.builder()
                            .businessNumber(request.getBusinessNumber())
                            .licenseFileUuid(request.getLicenseFileUuid())
                            .build()));
        } else if (role == Member.Role.ROLE_COMPANY_USER && request.getBusinessNumber() != null) {
            company = companyRepository.findByBusinessNumber(request.getBusinessNumber())
                    .orElseThrow(() -> new IllegalArgumentException("해당 사업자번호로 등록된 기업이 없습니다."));
        }

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .company(company)
                .build();

        // Wallet 분리 구조 반영: 본인인증 정보 저장
        if (request.getPortoneImpUid() != null) {
            member.getOrCreateWallet().updatePortOneInfo(request.getPortoneImpUid());
        }

        return memberRepository.save(member).getId();
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("봇 방지(Turnstile) 인증에 실패했습니다.");
        }

        try {
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    request.getEmail(), request.getPassword());
            Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

            String jwt = jwtTokenProvider.createToken(authentication);
            String refreshToken = jwtTokenProvider.createRefreshToken(authentication);
            redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));

            sseEmitters.sendLoginAlert(request.getEmail(), "새로운 기기에서 로그인이 감지되었습니다.");

            return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
        } catch (Exception e) {
            throw new RuntimeException("로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * MFA 전용 로그인: AuthController의 컴파일 에러를 해결합니다.
     */
    @Transactional
    public TokenResponse loginWithMfa(MfaLoginRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("봇 방지(Turnstile) 인증에 실패했습니다.");
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
            throw new IllegalArgumentException("잘못된 OTP 코드입니다. 다시 입력해주세요.");
        }

        // MFA 인증 성공 세션 유지 (관리자 24시간, 일반 15분)
        Duration sessionDuration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24)
                : Duration.ofMinutes(15);
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + member.getEmail(), "true", sessionDuration);

        String jwt = jwtTokenProvider.createToken(authentication);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication);
        redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
        String email = jwtTokenProvider.getSubjectFromToken(refreshToken);
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Authentication authentication = new UsernamePasswordAuthenticationToken(email, null,
                List.of(new SimpleGrantedAuthority(member.getRole().name())));

        String newAccessToken = jwtTokenProvider.createToken(authentication);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(authentication);
        redisTemplate.opsForValue().set("RT:" + email, newRefreshToken, Duration.ofDays(7));

        return new TokenResponse(newAccessToken, newRefreshToken, "Bearer", false, false);
    }

    @Transactional
    public MfaSetupResponse setupMfa(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.updateTotpSecret(key.getKey());
        member.disableMfa();
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), request.getCode());
        if (!isCodeValid) throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        member.enableMfa();
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, member.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }
        member.updatePassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public void updateAccountInfo(String email, String bankName, String accountNumber, String accountHolder) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        // Wallet 분리 구조 반영: Member를 통해 Wallet 정보 업데이트
        member.getOrCreateWallet().updateAccountInfo(bankName, accountNumber, accountHolder);
    }

    @Transactional
    public void updateNotificationSettings(String email, boolean allowNotifications) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        member.updateNotificationSettings(allowNotifications);
    }

    @Transactional(readOnly = true)
    public MfaSessionResponse getMfaSessionTtl(String email) {
        String key = "MFA_VERIFIED:" + email;
        Long ttl = redisTemplate.getExpire(key);
        return new MfaSessionResponse(ttl != null && ttl > 0, ttl != null ? ttl : 0, email);
    }

    @Transactional
    public void extendMfaSession(String email) {
        String key = "MFA_VERIFIED:" + email;
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Duration duration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) ? Duration.ofHours(24) : Duration.ofMinutes(15);
        redisTemplate.expire(key, duration);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        return UserProfileResponse.from(member);
    }

    @Transactional
    public void withdraw(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) throw new IllegalArgumentException("관리자는 탈퇴할 수 없습니다.");
        memberRepository.delete(member);
        redisTemplate.delete("RT:" + email);
    }
}