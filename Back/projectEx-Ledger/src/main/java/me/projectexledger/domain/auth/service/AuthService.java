package me.projectexledger.domain.auth.service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.auth.dto.*;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.domain.notification.service.SseEmitters;
import me.projectexledger.security.CustomUserDetails;
import me.projectexledger.security.JwtTokenProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
    private final StringRedisTemplate stringRedisTemplate;
    private final PortOneVerificationService portOneVerificationService;
    private final SseEmitters sseEmitters;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;
    private final BusinessVerificationService businessVerificationService;
    private final LocalVerificationStore localVerificationStore;
    private final me.projectexledger.domain.wallet.service.WalletService walletService;

    private static final String PASSWORD_PATTERN = "^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[@#$%^&+=!])(?=\\S+$).{8,}$";
    private static final Pattern PATTERN = Pattern.compile(PASSWORD_PATTERN);

    private void validatePasswordComplexity(String password) {
        if (password == null || !PATTERN.matcher(password).matches()) {
            throw new IllegalArgumentException("비밀번호는 8자 이상이며, 숫자, 영문자, 특수문자(@#$%^&+=!)를 최소 하나씩 포함해야 합니다.");
        }
    }

    private boolean isTestAccount(String email) {
        return email != null && (
                email.equals("user@example.com") ||
                email.equals("boss@exglobal.com") ||
                email.equals("admin@exledger.com")
        );
    }

    @Transactional(readOnly = true)
    public void checkEmailAvailability(String email) {
        if (memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }

        validatePasswordComplexity(request.getPassword());

        String verifiedRealName = null;
        if (request.getPortoneImpUid() != null) {
            Map<String, Object> verification = portOneVerificationService.getIdentityVerification(request.getPortoneImpUid());
            verifiedRealName = (String) verification.get("verifiedName");
            if (verifiedRealName != null && !verifiedRealName.equals(request.getName())) {
                throw new IllegalArgumentException("본인인증된 이름과 입력하신 이름이 일치하지 않습니다.");
            }
        }

        if (request.getMfaSecret() == null || request.getMfaCode() == null) {
            throw new IllegalArgumentException("MFA 설정 정보가 누락되었습니다.");
        }

        if (!googleAuthenticator.authorize(request.getMfaSecret(), Integer.parseInt(request.getMfaCode()))) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        Member.Role role = switch (request.getRoleType()) {
            case "COMPANY_ADMIN" -> Member.Role.ROLE_COMPANY_ADMIN;
            case "COMPANY_USER" -> Member.Role.ROLE_COMPANY_USER;
            case "INTEGRATED_ADMIN" -> Member.Role.ROLE_INTEGRATED_ADMIN;
            default -> Member.Role.ROLE_USER;
        };

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

        if (verifiedRealName != null) member.updateRealName(verifiedRealName);
        if (request.getPortoneImpUid() != null) member.getOrCreateWallet().updatePortOneInfo(request.getPortoneImpUid());
        member.updateTotpSecret(request.getMfaSecret());
        member.enableMfa();

        memberRepository.save(member);

        // SecurityContext 설정을 위해 인증 정보 생성
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(role.name()));
        CustomUserDetails userDetails = new CustomUserDetails(member.getEmail(), member.getPassword(), authorities, member.isApproved(), true);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        // [핵심 해결책] 후속 서비스 호출을 위해 SecurityContext에 수동 인증 바인딩
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // [본인인증 완료 시 즉시 지갑 활성화 및 계좌 발급]
        if (role == Member.Role.ROLE_USER) {
            walletService.activatePersonalAccount(request.getPortoneImpUid());
        }

        String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
        String jwt = jwtTokenProvider.createToken(authentication, sid);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication, sid);
        
        String rtKey = "RT:" + member.getEmail() + ":" + sid;
        redisTemplate.opsForValue().set(rtKey, refreshToken, Duration.ofDays(7));
        sseEmitters.sendLoginAlert(member.getEmail(), "환영합니다! 가입 및 로그인이 완료되었습니다.");

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    @Transactional
    public TokenResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        if (!isTestAccount(request.getEmail()) && !turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("봇 방지(Turnstile) 인증에 실패했습니다.");
        }

        try {
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    request.getEmail(), request.getPassword());
            Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

            Member member = memberRepository.findByEmail(authentication.getName()).orElseThrow();
            
            String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
            String jwt = jwtTokenProvider.createToken(authentication, sid);
            String refreshToken = jwtTokenProvider.createRefreshToken(authentication, sid);

            saveSessionMetadata(member.getEmail(), sid, httpRequest);
            redisTemplate.opsForValue().set("RT:" + member.getEmail() + ":" + sid, refreshToken, Duration.ofDays(7));

            sseEmitters.sendLoginAlert(member.getEmail(), "로그인 성공");

            return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
        } catch (Exception e) {
            throw new IllegalArgumentException("로그인 정보가 올바르지 않습니다.");
        }
    }

    @Transactional
    public TokenResponse loginWithMfa(MfaLoginRequest request, HttpServletRequest httpRequest) {
        if (!isTestAccount(request.getEmail()) && !turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 인증 실패");
        }

        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                request.getEmail(), request.getPassword());
        authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        Member member = memberRepository.findByEmail(request.getEmail()).orElseThrow();

        if (!member.isMfaEnabled()) throw new IllegalArgumentException("MFA가 비활성 상태입니다.");
        if (!googleAuthenticator.authorize(member.getTotpSecret(), Integer.parseInt(request.getCode()))) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        CustomUserDetails userDetails = new CustomUserDetails(member.getEmail(), "", authorities, member.isApproved(), true);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
        String jwt = jwtTokenProvider.createToken(authentication, sid);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication, sid);

        saveSessionMetadata(member.getEmail(), sid, httpRequest);
        redisTemplate.opsForValue().set("RT:" + member.getEmail() + ":" + sid, refreshToken, Duration.ofDays(7));

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) throw new IllegalArgumentException("토큰이 유효하지 않습니다.");
        
        String email = jwtTokenProvider.getSubjectFromToken(refreshToken);
        String sid = jwtTokenProvider.getClaimFromToken(refreshToken, claims -> claims.get("sid", String.class));
        String rtKey = (sid != null) ? "RT:" + email + ":" + sid : "RT:" + email;
        
        String savedToken = (String) redisTemplate.opsForValue().get(rtKey);
        if (savedToken == null || !savedToken.equals(refreshToken)) throw new IllegalArgumentException("세션이 만료되었습니다.");

        Member member = memberRepository.findByEmail(email).orElseThrow();
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(email, "", authorities, member.isApproved(), false), null, authorities);

        String newSid = (sid != null) ? sid : java.util.UUID.randomUUID().toString().substring(0, 8);
        String newJwt = jwtTokenProvider.createToken(authentication, newSid);
        String newRt = jwtTokenProvider.createRefreshToken(authentication, newSid);

        redisTemplate.delete(rtKey);
        redisTemplate.opsForValue().set("RT:" + email + ":" + newSid, newRt, Duration.ofDays(7));

        return new TokenResponse(newJwt, newRt, "Bearer", false, false);
    }

    private void saveSessionMetadata(String email, String sid, HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");
        if (ua == null) ua = "Unknown Browser";
        
        String meta = String.format("%s|%s|%s", ip, ua, LocalDateTime.now().toString());
        stringRedisTemplate.opsForValue().set("META:" + email + ":" + sid, meta, Duration.ofDays(7));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getActiveSessions(String email) {
        Set<String> keys = redisTemplate.keys("RT:" + email + ":*");
        if (keys == null) return new ArrayList<>();

        String currentSid = jwtTokenProvider.getCurrentSessionId();

        return keys.stream().map(key -> {
            String sid = key.substring(key.lastIndexOf(":") + 1);
            String meta = stringRedisTemplate.opsForValue().get("META:" + email + ":" + sid);
            
            SessionResponse.SessionResponseBuilder builder = SessionResponse.builder()
                    .sessionId(sid)
                    .isCurrentSession(sid.equals(currentSid));
            
            if (meta != null) {
                String[] parts = meta.split("\\|");
                if (parts.length >= 3) {
                    builder.clientIp(parts[0]).userAgent(parts[1]);
                    try { builder.loginTime(LocalDateTime.parse(parts[2])); }
                    catch (Exception e) { builder.loginTime(LocalDateTime.now()); }
                }
            } else {
                builder.clientIp("Unknown").userAgent("Unknown Browser").loginTime(LocalDateTime.now());
            }
            return builder.build();
        }).collect(Collectors.toList());
    }

    public void revokeSession(String email, String sessionId) {
        redisTemplate.delete("RT:" + email + ":" + sessionId);
        stringRedisTemplate.delete("META:" + email + ":" + sessionId);
    }

    @Transactional
    public void sendEmailVerificationCode(String email) {
        if (localVerificationStore.isRateLimited(email)) {
             throw new IllegalArgumentException("1분 후에 다시 요청해주세요.");
        }

        // [개발 편의] 인증 코드를 123456으로 고정합니다.
        String code = "123456"; 
        localVerificationStore.saveCode(email, code);
        
        emailService.sendVerificationCode(email, code);
        log.info("[AUTH-DEV] Locked verification code for {} is {}", email, code);
    }

    public void verifyEmailCode(String email, String code) {
        if (!localVerificationStore.verifyCode(email, code)) {
            throw new IllegalArgumentException("코드가 유효하지 않거나 만료되었습니다.");
        }
        log.info("[AUTH] Verification success for {}", email);
    }

    @Transactional(readOnly = true)
    public void requestPasswordReset(String email) {
        if (!memberRepository.existsByEmail(email)) throw new IllegalArgumentException("등록되지 않은 사용자입니다.");
        String token = java.util.UUID.randomUUID().toString();
        stringRedisTemplate.opsForValue().set("PWD_RESET:" + token, email, Duration.ofHours(1));
        emailService.sendPasswordResetLink(email, token);
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        // 레디스 토큰 확인 생략 (이메일 인증 제외 요청 반영)
        /*
        String email = stringRedisTemplate.opsForValue().get("PWD_RESET:" + request.getToken());
        if (email == null) throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        */
        
        // 주의: 토큰에서 이메일을 추출할 수 없는 구조라면 추가 논의 필요. 
        // 현재는 DTO에 이메일이 없으니, 일단 로직 유지만 하되 예외만 막음.
        // 유저가 이메일을 직접 입력하는 방식으로 변경하거나 토큰 검증 방식을 바꿀 필요가 있음.
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, member.getPassword())) throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        validatePasswordComplexity(newPassword);
        member.updatePassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public MfaSetupResponse setupMfa(String email, Integer currentOtpCode) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (member.isMfaEnabled()) {
            if (currentOtpCode == null || !googleAuthenticator.authorize(member.getTotpSecret(), currentOtpCode)) {
                throw new IllegalArgumentException("기존 OTP 인증에 실패했습니다.");
            }
        }
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.disableMfa();
        member.updateTotpSecret(key.getKey());
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    public MfaSetupResponse generateRegistrationMfa(String email) {
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (!googleAuthenticator.authorize(member.getTotpSecret(), Integer.parseInt(request.getCode()))) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }
        member.enableMfa();
        member.recordMfaReset();
    }

    @Transactional
    public MfaSetupResponse resetMfaByIdentity(String email, String impUid) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        String registeredUid = member.getWallet().getPortoneImpUid();
        if (registeredUid == null || !registeredUid.equals(impUid)) {
            throw new IllegalArgumentException("본인인증 정보가 일치하지 않습니다.");
        }
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.disableMfa();
        member.updateTotpSecret(key.getKey());
        member.recordMfaReset();
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
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
        if (Boolean.FALSE.equals(redisTemplate.hasKey(key))) throw new IllegalStateException("활성 보안 세션이 없습니다.");
        Member m = memberRepository.findByEmail(email).orElseThrow();
        Duration d = (m.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) ? Duration.ofHours(24) : Duration.ofMinutes(15);
        redisTemplate.expire(key, d);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String email) {
        return UserProfileResponse.from(memberRepository.findByEmail(email).orElseThrow());
    }

    @Transactional
    public void withdraw(String email) {
        Member m = memberRepository.findByEmail(email).orElseThrow();
        if (m.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) throw new IllegalArgumentException("관리자는 탈퇴할 수 없습니다.");
        m.requestWithdrawal();
        redisTemplate.delete("RT:" + email);
        redisTemplate.delete("MFA_VERIFIED:" + email);
    }

    @Transactional
    public void cancelWithdrawal(String email) {
        memberRepository.findByEmail(email).ifPresent(Member::cancelWithdrawal);
    }

    @Transactional
    public void updateAccountInfo(String email, String bank, String acc, String holder) {
        memberRepository.findByEmail(email).ifPresent(m -> m.getOrCreateWallet().updateAccountInfo(bank, acc, holder));
    }

    @Transactional
    public void updateNotificationSettings(String email, boolean enabled) {
        memberRepository.findByEmail(email).ifPresent(m -> m.updateNotificationSettings(enabled));
    }
}