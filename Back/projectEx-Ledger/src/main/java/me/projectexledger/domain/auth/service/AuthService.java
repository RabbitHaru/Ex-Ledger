package me.projectexledger.domain.auth.service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.auth.dto.*;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.domain.notification.service.SseEmitters;
import me.projectexledger.security.JwtTokenProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
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

    /**
     * 회원가입 (Wallet 분리 구조 + 실명 인증 강화)
     */
    @Transactional
    public Long signup(SignupRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 검증에 실패했습니다.");
        }

        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }

        // 1. 포트원 실명 일치 여부 확인 (B담당 로직 결합)
        String verifiedRealName = null;
        if (request.getPortoneImpUid() != null) {
            Map<String, Object> verification = portOneVerificationService.getIdentityVerification(request.getPortoneImpUid());
            verifiedRealName = (String) verification.get("verifiedName");
            if (verifiedRealName != null && !verifiedRealName.equals(request.getName())) {
                throw new IllegalArgumentException("본인인증된 이름과 입력하신 이름이 일치하지 않습니다.");
            }
        }

        // 2. 권한 설정
        Member.Role role = switch (request.getRoleType()) {
            case "COMPANY_ADMIN" -> Member.Role.ROLE_COMPANY_ADMIN;
            case "COMPANY_USER" -> Member.Role.ROLE_COMPANY_USER;
            default -> Member.Role.ROLE_USER;
        };

        // 3. 기업 정보 매핑
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

        // 4. 멤버 생성
        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .company(company)
                .build();

        // 5. 실명 및 Wallet 분리 구조 반영 (C담당 구조 유지)
        if (verifiedRealName != null) {
            member.updateRealName(verifiedRealName); // Member 엔티티에 실명 기록
        }

        if (request.getPortoneImpUid() != null) {
            // Wallet 엔티티에 인증 ID 저장
            member.getOrCreateWallet().updatePortOneInfo(request.getPortoneImpUid());
        }

        return memberRepository.save(member).getId();
    }

    /**
     * 로그인 (상세 예외 처리 포함)
     */
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
        } catch (org.springframework.security.authentication.DisabledException e) {
            throw new IllegalStateException("활동이 정지된 계정입니다. 고객센터에 문의해주세요.");
        } catch (Exception e) {
            throw new RuntimeException("로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * MFA 전용 로그인 (코드 검증 강화)
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

        int codeInt = Integer.parseInt(request.getCode()); // B담당 숫자 파싱 로직
        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), codeInt);
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다. 다시 입력해주세요.");
        }

        // 세션 유지 시간 차별화 (관리자 24h / 일반 15m)
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
            throw new IllegalArgumentException("유효하지 않은 토큰입니다. 다시 로그인해주세요.");
        }
        String email = jwtTokenProvider.getSubjectFromToken(refreshToken);

        String savedToken = (String) redisTemplate.opsForValue().get("RT:" + email);
        if (savedToken == null || !savedToken.equals(refreshToken)) {
            throw new IllegalArgumentException("무효화된 토큰입니다. 다시 로그인해주세요.");
        }

        Member member = memberRepository.findByEmail(email).orElseThrow();
        Authentication authentication = new UsernamePasswordAuthenticationToken(email, null,
                List.of(new SimpleGrantedAuthority(member.getRole().name())));

        String newAccessToken = jwtTokenProvider.createToken(authentication);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(authentication);
        redisTemplate.opsForValue().set("RT:" + email, newRefreshToken, Duration.ofDays(7));

        return new TokenResponse(newAccessToken, newRefreshToken, "Bearer", false, false);
    }

    /**
     * MFA 설정 (기존 OTP 검증 강화)
     */
    @Transactional
    public MfaSetupResponse setupMfa(String email, Integer currentOtpCode) {
        Member member = memberRepository.findByEmail(email).orElseThrow();

        // 이미 활성화된 경우 기존 OTP 검증 (B담당 보안 강화)
        if (member.isMfaEnabled()) {
            if (currentOtpCode == null) throw new IllegalArgumentException("MFA_CURRENT_CODE_REQUIRED");
            boolean isValid = googleAuthenticator.authorize(member.getTotpSecret(), currentOtpCode);
            if (!isValid) throw new IllegalArgumentException("현재 OTP 코드가 일치하지 않습니다.");
        }

        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.updateTotpSecret(key.getKey());
        member.disableMfa();
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        int codeInt = Integer.parseInt(request.getCode());
        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), codeInt);
        if (!isCodeValid) throw new IllegalArgumentException("잘못된 OTP 코드입니다.");

        member.enableMfa();
        member.recordMfaReset(); // 재설정 쿨다운 추적
    }

    /**
     * 본인인증을 통한 MFA 초기화 (B담당 핵심 기능)
     */
    @Transactional
    public MfaSetupResponse resetMfaByIdentity(String email, String impUid) {
        Member member = memberRepository.findByEmail(email).orElseThrow();

        // Wallet에 저장된 원본 인증 ID와 대조
        String registeredUid = member.getWallet().getPortoneImpUid();
        if (registeredUid == null || !registeredUid.equals(impUid)) {
            throw new IllegalArgumentException("본인인증 정보가 가입 시 등록된 정보와 일치하지 않습니다.");
        }

        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.disableMfa();
        member.updateTotpSecret(key.getKey());
        member.recordMfaReset();

        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
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
        // Wallet 분리 구조 반영 (C담당 구조)
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
        if (Boolean.FALSE.equals(redisTemplate.hasKey(key))) {
            throw new IllegalStateException("활성화된 MFA 세션이 없습니다.");
        }

        Member member = memberRepository.findByEmail(email).orElseThrow();
        Duration duration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24) : Duration.ofMinutes(15);
        redisTemplate.expire(key, duration);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        return UserProfileResponse.from(member);
    }

    /**
     * 회원 탈퇴 (B담당 Soft Delete 로직 결합)
     */
    @Transactional
    public void withdraw(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) {
            throw new IllegalArgumentException("관리자는 탈퇴할 수 없습니다.");
        }

        member.requestWithdrawal(); // 유예 기간 기록
        redisTemplate.delete("RT:" + email);
        redisTemplate.delete("MFA_VERIFIED:" + email);
        log.info("[WITHDRAW-REQUEST] User: {}", email);
    }

    @Transactional
    public void cancelWithdrawal(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        member.cancelWithdrawal();
    }
}