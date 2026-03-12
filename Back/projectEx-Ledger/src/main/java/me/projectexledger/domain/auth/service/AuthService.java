package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import me.projectexledger.security.CustomUserDetails;
import me.projectexledger.security.JwtTokenProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.Duration;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;

import me.projectexledger.domain.notification.service.SseEmitters;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;

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

    @Transactional(readOnly = true)
    public void checkEmailAvailability(String email) {
        if (memberRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입되어 있는 이메일입니다.");
        }
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
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

        // 2. 이메일 중복 확인 (이미 했더라도 보안상 한 번 더 수행)
        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
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

        log.debug("[MFA Verification] Email: {}, Secret: {}, Code: {}, ServerTime: {}", 
            request.getEmail(), request.getMfaSecret(), codeInt, java.time.LocalDateTime.now());

        if (!googleAuthenticator.authorize(request.getMfaSecret(), codeInt)) {
            log.warn("[MFA Verification Failure] OTP verification failed for email: {}", request.getEmail());
            throw new IllegalArgumentException("잘못된 OTP 코드입니다. 다시 시도해 주세요.");
        }

        // 4. 회원 엔티티 생성 및 기본 정보 설정
        Member.Role role;
        if ("COMPANY_ADMIN".equals(request.getRoleType())) {
            role = Member.Role.ROLE_COMPANY_ADMIN;
        } else if ("COMPANY_USER".equals(request.getRoleType())) {
            role = Member.Role.ROLE_COMPANY_USER;
        } else {
            role = Member.Role.ROLE_USER;
        }

        // 기업 처리
        Company company = null;
        if (role == Member.Role.ROLE_COMPANY_ADMIN && request.getBusinessNumber() != null) {
            // 기업 관리자: 새 Company 생성
            company = companyRepository.findByBusinessNumber(request.getBusinessNumber())
                    .orElseGet(() -> companyRepository.save(Company.builder()
                            .businessNumber(request.getBusinessNumber())
                            .licenseFileUuid(request.getLicenseFileUuid())
                            .build()));
        } else if (role == Member.Role.ROLE_COMPANY_USER && request.getBusinessNumber() != null) {
            // 기업 멤버: 기존 Company 조회
            company = companyRepository.findByBusinessNumber(request.getBusinessNumber())
                    .orElseThrow(() -> new IllegalArgumentException("해당 사업자번호로 등록된 기업이 없습니다."));
        }

        Member newMember = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .company(company)
                .portoneImpUid(request.getPortoneImpUid())
                .build();

        // 본인인증된 실명이 있으면 realName 업데이트
        if (request.getPortoneImpUid() != null) {
            Map<String, Object> verification = portOneVerificationService.getIdentityVerification(request.getPortoneImpUid());
            String verifiedName = (String) verification.get("verifiedName");
            if (verifiedName != null) {
                newMember.updateRealName(verifiedName);
            }
        }
        newMember.updateTotpSecret(request.getMfaSecret());
        newMember.enableMfa();
        // mfaResetAt은 신규 가입 시 null이어야 24시간 쿨다운에 걸리지 않음

        memberRepository.save(newMember);

        // 4.5 MFA 인증 세션 기록 (관리자는 24시간, 일반 유저는 15분)
        Duration sessionDuration = (role == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24)
                : Duration.ofMinutes(15);
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + newMember.getEmail(), "true", sessionDuration);

        // 5. 자동 로그인 처리 (DB 재조회 방지를 위해 수동으로 Authentication 생성)
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(role.name()));
        // 회원가입 시에는 이미 OTP를 검증했으므로 mfaVerified = true
        CustomUserDetails userDetails = new CustomUserDetails(newMember.getEmail(), newMember.getPassword(), authorities, newMember.isApproved(), true);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        String jwt = jwtTokenProvider.createToken(authentication);
        String refreshToken = jwtTokenProvider.createRefreshToken(authentication);
        try {
            redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));
        } catch (Exception e) {
            log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
        }

        sseEmitters.sendLoginAlert(request.getEmail(), "새로운 기기에서 로그인이 감지되었습니다.");

        return new TokenResponse(jwt, refreshToken, "Bearer", false, false);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        // 실제 운영 모드 Turnstile 검증 (실제 SiteKey 적용 시 활성화)
        if (!turnstileService.verifyToken(request.getTurnstileToken())) {
            throw new IllegalArgumentException("봇 방지(Turnstile) 인증에 실패했습니다.");
        }

        try {
            // 1. 아이디/비밀번호 인증 시도
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                    request.getEmail(), request.getPassword());
            
            // AuthenticationManager를 통한 인증 (Password 일치 여부 확인)
            Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

            // 2. 관리자 미승인 계정 체크 로직 제거 (마이페이지 확인을 위해 로그인 허용)
            // 승인 여부에 따른 권한 제어는 CustomUserDetailsService에서 수행됨

            // 3. MFA 체크 로직 제거 (로그인은 비번으로만, 금융 작업 시에만 MFA 요구)
            // 관리자 및 일반 유저 모두 로그인 시에는 OTP를 묻지 않음

            // 4. 최종 토큰 발급
            String jwt = jwtTokenProvider.createToken(authentication);
            String refreshToken = jwtTokenProvider.createRefreshToken(authentication);

            try {
                redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));
            } catch (Exception e) {
                log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
            }

            // 5. 로그인 알림 발송
            sseEmitters.sendLoginAlert(request.getEmail(), "새로운 기기에서 로그인이 감지되었습니다.");

            return new TokenResponse(jwt, refreshToken, "Bearer", false, false);

        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
        } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            throw new IllegalArgumentException("가입되지 않은 이메일 주소입니다.");
        } catch (org.springframework.security.authentication.DisabledException e) {
            throw new IllegalStateException("활동이 정지된 계정입니다. 고객센터에 문의해주세요.");
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException || e instanceof IllegalStateException) throw e;
            throw new RuntimeException("로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

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

        int codeInt;
        try {
            codeInt = Integer.parseInt(request.getCode());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("OTP 코드는 숫자여부야 합니다.");
        }

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), codeInt);
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다. 다시 입력해주세요.");
        }

        // MFA 인증 성공 시 세션 유지 (관리자는 24시간, 일반 유저는 15분)
        Duration sessionDuration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24)
                : Duration.ofMinutes(15);
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + member.getEmail(), "true", sessionDuration);

        // JWT 발급 시 mfaVerified = true 정보 포함을 위해 Authentication 객체 수동 생성 (userDetails 기반)
        List<SimpleGrantedAuthority> authorities = authentication.getAuthorities().stream()
                .map(a -> new SimpleGrantedAuthority(a.getAuthority()))
                .collect(Collectors.toList());
        CustomUserDetails userDetails = new CustomUserDetails(member.getEmail(), "", authorities, member.isApproved(), true);
        Authentication mfaAuthentication = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

        String jwt = jwtTokenProvider.createToken(mfaAuthentication);
        String refreshToken = jwtTokenProvider.createRefreshToken(mfaAuthentication);

        try {
            redisTemplate.opsForValue().set("RT:" + authentication.getName(), refreshToken, Duration.ofDays(7));
        } catch (Exception e) {
            log.error("⚠️ [Redis] 리프레시 토큰 저장 실패 (Redis 연결 확인 필요): {}", e.getMessage());
        }

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

        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(member.getRole().name()));
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                new CustomUserDetails(email, "", authorities, member.isApproved(), false),
                null,
                authorities
        );

        String newAccessToken = jwtTokenProvider.createToken(authentication);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(authentication);

        redisTemplate.opsForValue().set("RT:" + email, newRefreshToken, Duration.ofDays(7));

        return new TokenResponse(newAccessToken, newRefreshToken, "Bearer", false, false);
    }

    @Transactional
    public MfaSetupResponse setupMfa(String email, Integer currentOtpCode) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // ★ 보안 강화: 이미 MFA가 활성화된 경우, 기존 OTP 코드를 반드시 검증
        if (member.isMfaEnabled()) {
            if (currentOtpCode == null) {
                throw new IllegalArgumentException("MFA_CURRENT_CODE_REQUIRED");
            }
            boolean isValid = googleAuthenticator.authorize(member.getTotpSecret(), currentOtpCode);
            if (!isValid) {
                throw new IllegalArgumentException("현재 OTP 코드가 일치하지 않습니다. 기존 인증 앱의 코드를 입력해주세요.");
            }
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
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        int codeInt;
        try {
            codeInt = Integer.parseInt(request.getCode());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("OTP 코드는 숫자여야 합니다.");
        }

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), codeInt);
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 코드입니다.");
        }

        member.enableMfa();
        member.recordMfaReset(); // 재설정 시각 기록 (24시간 쿨다운 추적)
    }

    /**
     * OTP 분실 시 본인인증을 통한 MFA 초기화
     * 가입 시 등록된 portoneImpUid와 동일 인물인지 대조
     */
    @Transactional
    public MfaSetupResponse resetMfaByIdentity(String email, String impUid) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (!member.isMfaEnabled()) {
            throw new IllegalArgumentException("MFA가 활성화되어 있지 않습니다. 일반 설정을 이용해주세요.");
        }

        // 가입 시 등록된 본인인증 정보와 대조
        String registeredImpUid = member.getPortoneImpUid();
        if (registeredImpUid == null || registeredImpUid.isBlank()) {
            throw new IllegalArgumentException("가입 시 본인인증 정보가 등록되지 않았습니다. 관리자에게 문의해주세요.");
        }

        if (!registeredImpUid.equals(impUid)) {
            throw new IllegalArgumentException("본인인증 정보가 가입 시 등록된 정보와 일치하지 않습니다.");
        }

        // 본인인증 성공 → OTP 초기화 + 새 키 발급
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        member.disableMfa();
        member.updateTotpSecret(key.getKey());
        member.recordMfaReset(); // 24시간 쿨다운

        log.info("[MFA-RESET-BY-IDENTITY] User: {}, OTP 초기화 완료 (본인인증)", email);

        String qrCodeUrl = String.format("otpauth://totp/Ex-Ledger:%s?secret=%s&issuer=Ex-Ledger", email, key.getKey());
        return new MfaSetupResponse(key.getKey(), qrCodeUrl);
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

    @Transactional(readOnly = true)
    public MfaSessionResponse getMfaSessionTtl(String email) {
        String key = "MFA_VERIFIED:" + email;
        Long ttl = redisTemplate.getExpire(key);
        
        if (ttl == null || ttl <= 0) {
            return new MfaSessionResponse(false, 0, email);
        }
        
        return new MfaSessionResponse(true, ttl, email);
    }

    @Transactional
    public void extendMfaSession(String email) {
        String key = "MFA_VERIFIED:" + email;
        Boolean hasSession = redisTemplate.hasKey(key);
        
        if (hasSession == null || !hasSession) {
            throw new IllegalStateException("활성화된 MFA 세션이 없습니다. 먼저 OTP 인증을 해주세요.");
        }
        
        // 세션 연장 (관리자는 24시간, 일반 유저는 15분)
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        Duration sessionDuration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN)
                ? Duration.ofHours(24)
                : Duration.ofMinutes(15);
        redisTemplate.expire(key, sessionDuration);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return UserProfileResponse.from(member);
    }

    @Transactional
    public void withdraw(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) {
            throw new IllegalArgumentException("시스템 총괄 관리자는 회원 탈퇴가 불가능합니다.");
        }

        // 즉시 삭제 대신 탈퇴 요청 일시 기록 (Soft Delete 유예 기간)
        member.requestWithdrawal();
        
        // 리프레시 토큰 삭제 (세션 종료)
        redisTemplate.delete("RT:" + email);
        redisTemplate.delete("MFA_VERIFIED:" + email);
    }

    @Transactional
    public void cancelWithdrawal(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        member.cancelWithdrawal();
    }
}
