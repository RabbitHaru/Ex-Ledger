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
import me.projectexledger.security.CustomUserDetails;
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
import java.util.Collections;
import java.util.List;
import java.util.Map;
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
    private final PortOneVerificationService portOneVerificationService;
    private final SseEmitters sseEmitters;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public void checkEmailAvailability(String email) {
        if (memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }
    }
    @Transactional
    public TokenResponse signup(SignupRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("봇 방지(Turnstile) 검증에 실패했습니다.");
        }

        // 2. 이메일 중복 확인 (이미 했더라도 보안상 한 번 더 수행)
        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // 2.5 이메일 실소유 인증 확인 (B담당 추가 요청)
        String verifiedKey = "EMAIL_VERIFIED:" + request.getEmail();
        if (Boolean.FALSE.equals(redisTemplate.hasKey(verifiedKey))) {
            throw new IllegalArgumentException("이메일 인증이 완료되지 않았습니다.");
        }
        redisTemplate.delete(verifiedKey); // 사용 후 삭제

        // 1. 포트원 실명 인증 및 대조 (B담당 로직)
        String verifiedRealName = null;
        if (request.getPortoneImpUid() != null) {
            Map<String, Object> verification = portOneVerificationService.getIdentityVerification(request.getPortoneImpUid());
            verifiedRealName = (String) verification.get("verifiedName");
            if (verifiedRealName != null && !verifiedRealName.equals(request.getName())) {
                throw new IllegalArgumentException("본인인증된 이름과 입력하신 이름이 일치하지 않습니다.");
            }
        }

        // 3. MFA 검증 (회원가입 시 전달된 secret과 code 검증)
        if (request.getMfaSecret() == null || request.getMfaCode() == null) {
            throw new IllegalArgumentException("MFA 설정 정보가 누락되었습니다.");
        }

        int codeInt;
        try {
            codeInt = Integer.parseInt(request.getMfaCode());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("OTP 코드는 숫자여야 합니다.");
        }

        if (!googleAuthenticator.authorize(request.getMfaSecret(), codeInt)) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다. 다시 시도해 주세요.");
        }

        // 2. 권한 설정
        Member.Role role = switch (request.getRoleType()) {
            case "COMPANY_ADMIN" -> Member.Role.ROLE_COMPANY_ADMIN;
            case "COMPANY_USER" -> Member.Role.ROLE_COMPANY_USER;
            case "INTEGRATED_ADMIN" -> Member.Role.ROLE_INTEGRATED_ADMIN;
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

        // 5. 실명 기록 및 지갑 분리 구조 반영 (C담당 구조)
        if (verifiedRealName != null) {
            member.updateRealName(verifiedRealName);
        }

        if (request.getPortoneImpUid() != null) {
            // Wallet 엔티티에 인증 ID 저장
            member.getOrCreateWallet().updatePortOneInfo(request.getPortoneImpUid());
        }
        member.updateTotpSecret(request.getMfaSecret());
        member.enableMfa();
        // mfaResetAt은 신규 가입 시 null이어야 24시간 쿨다운에 걸리지 않음

        memberRepository.save(member);

        // 4.5 MFA 인증 세션 기록 (관리자는 24시간, 일반 유저는 15분)
        Duration sessionDuration = (role == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24)
                : Duration.ofMinutes(15);
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + member.getEmail(), "true", sessionDuration);

        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(role.name()));
        String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
        CustomUserDetails userDetails = new CustomUserDetails(member.getEmail(), member.getPassword(), authorities, member.isApproved(), true);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        String jwt = jwtTokenProvider.createToken(authentication, sid);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication, sid);
        try {
            // RT 저장 시 세션 정보를 함께 저장
            String rtKey = "RT:" + authentication.getName() + ":" + sid;
            redisTemplate.opsForValue().set(rtKey, refreshToken, Duration.ofDays(7));
        } catch (Exception e) {
            log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
        }

        sseEmitters.sendLoginAlert(request.getEmail(), "새로운 기기에서 로그인이 감지되었습니다.");

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    /**
     * 로그인 (B담당 상세 예외 처리 + C담당 SSE 알림)
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

            String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
            String jwt = jwtTokenProvider.createToken(authentication, sid);
            String refreshToken = jwtTokenProvider.createRefreshToken(authentication, sid);

            try {
                redisTemplate.opsForValue().set("RT:" + authentication.getName() + ":" + sid, refreshToken, Duration.ofDays(7));
            } catch (Exception e) {
                log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
            }

            // 로그인 알림 발송
            sseEmitters.sendLoginAlert(request.getEmail(), "새로운 기기에서 로그인이 감지되었습니다.");

            return new TokenResponse(jwt, refreshToken, "Bearer", false, false);

        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
        } catch (org.springframework.security.authentication.DisabledException e) {
            throw new IllegalStateException("활동이 정지된 계정입니다. 고객센터에 문의해주세요.");
        } catch (Exception e) {
            log.error("Login error for user {}: {}", request.getEmail(), e.getMessage());
            throw new RuntimeException("로그인 처리 중 오류가 발생했습니다.");
        }
    }

    /**
     * MFA 전용 로그인 (세션 TTL 차별화 로직 포함)
     */
    @Transactional
    public TokenResponse loginWithMfa(MfaLoginRequest request) {
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("Turnstile 인증에 실패했습니다.");
        }

        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                request.getEmail(), request.getPassword());
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!member.isMfaEnabled()) {
            throw new IllegalArgumentException("MFA가 활성화되어 있지 않습니다.");
        }

        int codeInt = Integer.parseInt(request.getCode());
        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), codeInt);
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        // 세션 유지 시간 차별화 (관리자 24h / 일반 15m)
        Duration sessionDuration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24) : Duration.ofMinutes(15);
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + member.getEmail(), "true", sessionDuration);

        // JWT 발급 시 mfaVerified = true 정보 포함을 위해 Authentication 객체 수동 생성 (userDetails 기반)
        List<SimpleGrantedAuthority> authorities = authentication.getAuthorities().stream()
                .map(a -> new SimpleGrantedAuthority(a.getAuthority()))
                .collect(Collectors.toList());
        CustomUserDetails userDetails = new CustomUserDetails(member.getEmail(), "", authorities, member.isApproved(), true);
        Authentication mfaAuthentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        String sid = java.util.UUID.randomUUID().toString().substring(0, 8);
        String jwt = jwtTokenProvider.createToken(mfaAuthentication, sid);
        String refreshToken = jwtTokenProvider.createRefreshToken(mfaAuthentication, sid);

        try {
            redisTemplate.opsForValue().set("RT:" + authentication.getName() + ":" + sid, refreshToken, Duration.ofDays(7));
        } catch (Exception e) {
            log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
        }

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    /**
     * 토큰 갱신 (B담당 CustomUserDetails 반영)
     */
    @Transactional
    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 리프레시 토큰입니다.");
        }
        String email = jwtTokenProvider.getSubjectFromToken(refreshToken);
        
        // 리프레시 토큰에서 sid 추출
        String sid = jwtTokenProvider.getClaimFromToken(refreshToken, claims -> claims.get("sid", String.class));

        String rtKey = (sid != null) ? "RT:" + email + ":" + sid : "RT:" + email;
        String savedToken = (String) redisTemplate.opsForValue().get(rtKey);
        
        if (savedToken == null || !savedToken.equals(refreshToken)) {
            throw new IllegalArgumentException("만료된 세션입니다. 다시 로그인해주세요.");
        }

        Member member = memberRepository.findByEmail(email).orElseThrow();
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(email, "", authorities, member.isApproved(), false),
                null,
                authorities
        );

        String newSid = (sid != null) ? sid : java.util.UUID.randomUUID().toString().substring(0, 8);
        String newAccessToken = jwtTokenProvider.createToken(authentication, newSid);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(authentication, newSid);
        
        redisTemplate.delete(rtKey);
        redisTemplate.opsForValue().set("RT:" + email + ":" + newSid, newRefreshToken, Duration.ofDays(7));

        return new TokenResponse(newAccessToken, newRefreshToken, "Bearer", false, false);
    }

    /**
     * MFA 설정 (기존 OTP 검증 강화)
     */
    @Transactional
    public MfaSetupResponse setupMfa(String email, Integer currentOtpCode) {
        Member member = memberRepository.findByEmail(email).orElseThrow();

        if (member.isMfaEnabled()) {
            if (currentOtpCode == null) throw new IllegalArgumentException("현재 사용 중인 OTP 코드가 필요합니다.");
            boolean isValid = googleAuthenticator.authorize(member.getTotpSecret(), currentOtpCode);
            if (!isValid) throw new IllegalArgumentException("현재 OTP 코드가 일치하지 않습니다.");
        }

        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.disableMfa();
        member.updateTotpSecret(key.getKey());

        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    /**
     * 회원가입용 퍼블릭 MFA 설정 생성 (계정 생성 전)
     */
    public MfaSetupResponse generateRegistrationMfa(String email) {
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
    }

    @Transactional
    public void enableMfa(String email, MfaVerifyRequest request) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        int codeInt = Integer.parseInt(request.getCode());
        if (!googleAuthenticator.authorize(member.getTotpSecret(), codeInt)) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        member.enableMfa();
        member.recordMfaReset(); // 24시간 쿨다운 추적용
    }

    /**
     * OTP 분실 시 본인인증을 통한 MFA 초기화 (B담당 핵심 로직 + C담당 Wallet 구조)
     */
    @Transactional
    public MfaSetupResponse resetMfaByIdentity(String email, String impUid) {
        Member member = memberRepository.findByEmail(email).orElseThrow();

        // Wallet에 저장된 원본 인증 ID와 대조 (C담당 구조 반영)
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
        // Wallet 분리 구조 반영 (C담당 구조 유지)
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

    @Transactional
    public void withdraw(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) {
            throw new IllegalArgumentException("시스템 총괄 관리자는 탈퇴할 수 없습니다.");
        }

        member.requestWithdrawal(); // 탈퇴 유예 기간 시작
        redisTemplate.delete("RT:" + email);
        redisTemplate.delete("MFA_VERIFIED:" + email);
        log.info("[WITHDRAW-REQUEST] User: {}", email);
    }

    @Transactional
    public void cancelWithdrawal(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        member.cancelWithdrawal();
    }

    // --- B담당: 추가 보안 기능 (이메일 인증, 비밀번호 재설정, 세션 관리) ---

    @Transactional(readOnly = true)
    public void sendEmailVerificationCode(String email) {
        if (memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }
        String code = String.valueOf((int)(Math.random() * 900000) + 100000); // 6자리 난수
        redisTemplate.opsForValue().set("EMAIL_CODE:" + email, code, Duration.ofMinutes(10));
        emailService.sendVerificationCode(email, code);
    }

    public void verifyEmailCode(String email, String code) {
        String savedCode = (String) redisTemplate.opsForValue().get("EMAIL_CODE:" + email);
        if (savedCode == null || !savedCode.equals(code)) {
            throw new IllegalArgumentException("인증 코드가 만료되었거나 일치하지 않습니다.");
        }
        redisTemplate.opsForValue().set("EMAIL_VERIFIED:" + email, "true", Duration.ofMinutes(15));
        redisTemplate.delete("EMAIL_CODE:" + email);
    }

    @Transactional(readOnly = true)
    public void requestPasswordReset(String email) {
        if (!memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("등록되지 않은 이메일입니다.");
        }
        String token = java.util.UUID.randomUUID().toString();
        redisTemplate.opsForValue().set("PWD_RESET:" + token, email, Duration.ofHours(1));
        emailService.sendPasswordResetLink(email, token);
    }

    @Transactional
    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        String email = (String) redisTemplate.opsForValue().get("PWD_RESET:" + request.getToken());
        if (email == null) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 토큰입니다.");
        }

        Member member = memberRepository.findByEmail(email).orElseThrow();
        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        redisTemplate.delete("PWD_RESET:" + request.getToken());
    }

    public List<SessionResponse> getActiveSessions(String email) {
        var keys = redisTemplate.keys("RT:" + email + ":*");
        if (keys == null) return Collections.emptyList();

        return keys.stream().map(key -> {
            String sid = key.substring(key.lastIndexOf(":") + 1);
            // 실제 구현 시 Redis에 세션 메타데이터(IP 등)를 Hash로 저장하면 더 좋음
            // 여기서는 단순 데모를 위해 기본 정보만 반환
            return SessionResponse.builder()
                    .sessionId(sid)
                    .clientIp("Unknown") // 실제 HttpServletRequest에서 받아온 정보를 저장해야 함
                    .loginTime(java.time.LocalDateTime.now())
                    .isCurrentSession(false) // 프론트에서 자신의 현재 토큰과 대조 필요
                    .build();
        }).collect(Collectors.toList());
    }

    public void revokeSession(String email, String sessionId) {
        redisTemplate.delete("RT:" + email + ":" + sessionId);
    }
}