package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.Map;

/**
 * 포트원 V2 본인인증 API 연동 서비스 (샌드박스)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortOneVerificationService {

    private final WebClient.Builder webClientBuilder;

    @Value("${PORTONE_API_SECRET}")
    private String apiSecret;

    /**
     * 포트원 V2 액세스 토큰 발급
     */
    private String getAccessToken() {
        try {
            Map<String, Object> response = webClientBuilder.build()
                    .post()
                    .uri("https://api.portone.io/login/api-key")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("apiKey", apiSecret))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return (String) response.get("accessToken");
        } catch (Exception e) {
            log.error("PortOne Access Token 발급 실패: {}", e.getMessage());
            throw new RuntimeException("본인인증 서버 통신 실패");
        }
    }

    /**
     * 본인인증 상세 정보 조회 (PortOne V2 Identity Verification)
     */
    public Map<String, Object> getIdentityVerification(String identityVerificationId) {
        if (identityVerificationId == null || identityVerificationId.startsWith("identity_dummy")
                || identityVerificationId.startsWith("imp_dummy")) {
            log.info("Dummy identity verification detected, bypassing PortOne API call.");
            return Map.of("status", "SUCCESS", "verifiedName", "더미사용자");
        }

        String accessToken = getAccessToken();
        try {
            return webClientBuilder.build()
                    .get()
                    .uri("https://api.portone.io/identity-verifications/" + identityVerificationId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("PortOne 본인인증 조회 실패 (id: {}): {}", identityVerificationId, e.getMessage());
            throw new RuntimeException("본인인증 정보를 불러올 수 없습니다.");
        }
    }
}
