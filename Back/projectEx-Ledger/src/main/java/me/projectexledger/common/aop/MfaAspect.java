package me.projectexledger.common.aop;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.security.SecurityUtil;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.data.redis.core.RedisTemplate;
import me.projectexledger.common.annotation.RequireMfa;
import org.aspectj.lang.JoinPoint;
import java.lang.reflect.Method;
import java.time.Duration;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class MfaAspect {

    private final MemberRepository memberRepository;
    private final GoogleAuthenticator googleAuthenticator;
    private final RedisTemplate<String, Object> redisTemplate;

    // @RequireMfa 어노테이션이 붙은 컨트롤러/메서드 실행 직전에 가로챔
    @Before("@annotation(requireMfa)")
    public void verifyMfa(JoinPoint joinPoint, RequireMfa requireMfa) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            throw new IllegalStateException("요청 컨텍스트를 찾을 수 없습니다.");
        }

        HttpServletRequest request = attributes.getRequest();
        String otpCodeStr = request.getHeader("X-MFA-Code");
        String email = SecurityUtil.getCurrentUserEmail();

        boolean isHighValue = requireMfa.highValue();

        // 자동 고액 거래 감지 (송금 API인 경우 금액 체크)
        if (!isHighValue) {
            Object[] args = joinPoint.getArgs();
            for (Object arg : args) {
                try {
                    // DTO에서 getAmount() 메서드 존재 여부 확인
                    Method getAmount = arg.getClass().getMethod("getAmount");
                    Object amount = getAmount.invoke(arg);
                    if (amount instanceof Number && ((Number) amount).doubleValue() >= 10000000) {
                        isHighValue = true;
                        log.info("High-value transaction detected (Amount: {}). Forcing real-time MFA.", amount);
                        break;
                    }
                } catch (Exception ignored) {}
            }
        }

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 🌟 사이트 총괄 관리자(INTEGRATED_ADMIN)는 모든 MFA 인증에서 예외 처리 (관리 편의성)
        if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) {
            log.info("Bypassing MFA for Integrated Admin: {}", email);
            return;
        }

        if (!member.isMfaEnabled()) {
            // 프론트엔드에서 인터셉트하여 /auth/mfa로 리다이렉트할 수 있도록 특정 코드 포함
            throw new IllegalArgumentException("MFA_SETUP_REQUIRED: 금융 거래를 위해 구글 OTP 설정이 필요합니다.");
        }

        // 고액 거래가 아닌 경우, 15분 MFA 세션 체크 (세션이 있으면 OTP 헤더 없이 통과 가능)
        if (!isHighValue) {
            Boolean hasMfaSession = redisTemplate.hasKey("MFA_VERIFIED:" + email);
            if (hasMfaSession != null && hasMfaSession) {
                if (otpCodeStr == null || otpCodeStr.trim().isEmpty()) {
                    log.info("MFA Session active for User: {}. Skipping real-time OTP check for non-high-value action.", email);
                    return;
                }
            }
        } else {
            // 고액 거래인 경우
            if (otpCodeStr == null || otpCodeStr.trim().isEmpty()) {
                throw new IllegalArgumentException("HIGH_VALUE_MFA_REQUIRED: 고액 거래 승인을 위해 실시간 OTP 인증번호가 필요합니다.");
            }
        }

        if (otpCodeStr == null || otpCodeStr.trim().isEmpty()) {
            throw new IllegalArgumentException("MFA_SESSION_EXPIRED: 보안 세션이 만료되었습니다. 다시 로그인해주세요.");
        }

        int otpCode;
        try {
            otpCode = Integer.parseInt(otpCodeStr.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("잘못된 OTP 코드 형식입니다. 숫자만 입력해주세요.");
        }

        boolean isCodeValid = googleAuthenticator.authorize(member.getTotpSecret(), otpCode);
        if (!isCodeValid) {
            throw new IllegalArgumentException("잘못된 OTP 인증번호입니다. 확인 후 다시 시도해주세요.");
        }

        // 인증 성공 시 세션 갱신/생성 (관리자는 24시간, 일반 유저는 15분)
        Duration sessionDuration = (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) 
                ? Duration.ofHours(24) 
                : Duration.ofMinutes(15);
        
        redisTemplate.opsForValue().set("MFA_VERIFIED:" + email, "true", sessionDuration);

        log.info("JIT MFA Verified successfully for User: {} (Duration: {})", email, sessionDuration);
    }
}
