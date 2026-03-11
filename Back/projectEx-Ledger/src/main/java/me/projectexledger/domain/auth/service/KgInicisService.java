package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KgInicisService {

    @Value("${kginicis.api.key:}")
    private String apiKey;

    @Value("${kginicis.api.secret:}")
    private String apiSecret;

    /**
     * KG 이니시스 통합 인증 결과 검증 (Mock Implementation)
     * 실제 연동 시 해당 업체의 API 규격에 맞춰 수정 필요
     */
    public boolean verifyAuth(String impUid) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("KG Inicis API Key is missing. Skipping real validation.");
            return true;
        }

        try {
            log.info("Verifying KG Inicis Auth for impUid: {}", impUid);
            // 실제 KG 이니시스 통합인증 API 호출 로직 (예시)
            /*
            Map response = webClientBuilder.build()
                    .get()
                    .uri("https://api.iamport.kr/certifications/" + impUid)
                    .header("Authorization", "Bearer " + getAccessToken())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            return response != null && "certified".equals(response.get("status"));
            */
            return true; 
        } catch (Exception e) {
            log.error("KG Inicis Auth verification failed", e);
            return false;
        }
    }
}
