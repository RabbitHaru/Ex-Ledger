package me.projectexledger.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.data.redis.core.RedisTemplate;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * JWT 생성 및 검증
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private final Key key;
    private final long tokenValidityInMilliseconds;
    private final long refreshTokenValidityInMilliseconds;
    private final RedisTemplate<String, Object> redisTemplate;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.token-validity-in-seconds}") long tokenValidityInSeconds,
            @Value("${jwt.refresh-token-validity-in-seconds}") long refreshTokenValidityInSeconds,
            RedisTemplate<String, Object> redisTemplate) {
        byte[] keyBytes;
        try {
            // Base64 디코딩 시도
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (Exception e) {
            // 실패 시 일반 문자열 바이트 사용
            keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        }

        // HMAC-SHA256을 위한 최소 키 길이(256비트/32바이트) 보장
        if (keyBytes.length < 32) {
            log.warn("JWT secret key is too short. Minimum 32 bytes required. Padding with zeros.");
            byte[] paddedKey = new byte[32];
            System.arraycopy(keyBytes, 0, paddedKey, 0, Math.min(keyBytes.length, 32));
            keyBytes = paddedKey;
        }

        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.tokenValidityInMilliseconds = tokenValidityInSeconds * 1000;
        this.refreshTokenValidityInMilliseconds = refreshTokenValidityInSeconds * 1000;
        this.redisTemplate = redisTemplate;
    }

    public String createToken(Authentication authentication) {
        return createToken(authentication, null);
    }

    public String createToken(Authentication authentication, String sessionId) {
        String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        boolean isIntegratedAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_INTEGRATED_ADMIN".equals(a.getAuthority()));

        boolean isApproved = false;
        boolean mfaVerified = false;
        if (authentication.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails details = (CustomUserDetails) authentication.getPrincipal();
            isApproved = details.isApproved();
            mfaVerified = details.isMfaVerified();
        }

        long now = (new Date()).getTime();
        // B담당: 통합 관리자는 24시간, 일반 유저는 설정된 기본값(15분) 사용
        long validityMs = isIntegratedAdmin
                ? Duration.ofHours(24).toMillis()
                : this.tokenValidityInMilliseconds;
        Date validity = new Date(now + validityMs);

        JwtBuilder builder = Jwts.builder()
                .setSubject(authentication.getName())
                .claim("auth", authorities)
                .claim("isApproved", isApproved)
                .claim("mfaVerified", mfaVerified);
        
        if (sessionId != null) {
            builder.claim("sid", sessionId);
        }

        return builder
                .signWith(key, SignatureAlgorithm.HS256)
                .setExpiration(validity)
                .compact();
    }

    public String createRefreshToken(Authentication authentication) {
        return createRefreshToken(authentication, null);
    }

    public String createRefreshToken(Authentication authentication, String sessionId) {
        long now = (new Date()).getTime();
        Date validity = new Date(now + this.refreshTokenValidityInMilliseconds);

        JwtBuilder builder = Jwts.builder()
                .setSubject(authentication.getName());
        
        if (sessionId != null) {
            builder.claim("sid", sessionId);
        }

        return builder
                .signWith(key, SignatureAlgorithm.HS256)
                .setExpiration(validity)
                .compact();
    }

    public String getSubjectFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public <T> T getClaimFromToken(String token, java.util.function.Function<Claims, T> claimsResolver) {
        final Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claimsResolver.apply(claims);
    }

    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        Collection<? extends GrantedAuthority> authorities = Arrays.stream(claims.get("auth").toString().split(","))
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());

        boolean isApproved = claims.get("isApproved", Boolean.class) != null && claims.get("isApproved", Boolean.class);
        boolean mfaVerified = claims.get("mfaVerified", Boolean.class) != null && claims.get("mfaVerified", Boolean.class);
        UserDetails principal = new CustomUserDetails(claims.getSubject(), "", authorities, isApproved, mfaVerified);
        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            
            // B담당: 세션 유효성 강제 확인 (Immediate Session Termination)
            try {
                String sid = getClaimFromToken(token, claims -> claims.get("sid", String.class));
                String email = getClaimFromToken(token, Claims::getSubject);
                if (sid != null && email != null) {
                    String rtKey = "RT:" + email + ":" + sid;
                    if (Boolean.FALSE.equals(redisTemplate.hasKey(rtKey))) {
                        log.warn("⚠️ [Auth] Revoked session access attempt: {} (SID: {})", email, sid);
                        return false;
                    }
                }
            } catch (Exception e) {
                // sid가 없는 토큰(예: 이전 버전)은 signature만 맞으면 일단 통과
            }
            
            return true;
        } catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
            log.info("잘못된 JWT 서명입니다.");
        } catch (ExpiredJwtException e) {
            log.info("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException e) {
            log.info("지원되지 않는 JWT 토큰입니다.");
        } catch (IllegalArgumentException e) {
            log.info("JWT 토큰이 잘못되었습니다.");
        }
        return false;
    }

    public String getCurrentSessionId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getCredentials() == null) {
            return null;
        }
        
        try {
            String token = authentication.getCredentials().toString();
            return getClaimFromToken(token, claims -> claims.get("sid", String.class));
        } catch (Exception e) {
            return null;
        }
    }
}
