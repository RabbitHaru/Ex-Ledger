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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
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

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secretKey,
            @Value("${jwt.token-validity-in-seconds}") long tokenValidityInSeconds) {
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
        this.refreshTokenValidityInMilliseconds = Duration.ofDays(7).toMillis();
    }

    public String createToken(Authentication authentication) {
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
        long validityMs = isIntegratedAdmin
                ? Duration.ofHours(24).toMillis()
                : Duration.ofMinutes(15).toMillis();
        Date validity = new Date(now + validityMs);

        return Jwts.builder()
                .setSubject(authentication.getName())
                .claim("auth", authorities)
                .claim("isApproved", isApproved)
                .claim("mfaVerified", mfaVerified)
                .signWith(key, SignatureAlgorithm.HS256)
                .setExpiration(validity)
                .compact();
    }

    public String createRefreshToken(Authentication authentication) {
        long now = (new Date()).getTime();
        Date validity = new Date(now + this.refreshTokenValidityInMilliseconds);

        return Jwts.builder()
                .setSubject(authentication.getName())
                .signWith(key, SignatureAlgorithm.HS256)
                .setExpiration(validity)
                .compact();
    }

    public String getSubjectFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
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
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.info("Invalid JWT token: {}", e.getMessage());
        }
        return false;
    }
}
