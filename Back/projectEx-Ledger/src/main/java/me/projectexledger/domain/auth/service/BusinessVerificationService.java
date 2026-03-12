package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.auth.dto.BusinessVerificationResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusinessVerificationService {

    private final WebClient.Builder webClientBuilder;

    @Value("${nts.api.key:dummy_key}")
    private String apiKey;

    public BusinessVerificationResponse verify(String businessNumber) {
        String cleanNumber = businessNumber.replaceAll("-", "");

        if ("dummy_key".equals(apiKey)) {
            log.info("Bypassing actual NTS API call because dummy_key is used. Mocking success for: {}", cleanNumber);
            return new BusinessVerificationResponse(true, "유효한 사업자입니다. (Mock)");
        }

        String url = "https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=" + apiKey;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("b_no", List.of(cleanNumber));

        try {
            log.info("Verifying business number: {} (URL length: {})", cleanNumber, url.length());
            
            // WebClient의 기본 인코딩이 serviceKey를 망가뜨릴 수 있으므로 URI.create 사용
            Map response = webClientBuilder.build()
                    .post()
                    .uri(java.net.URI.create(url))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(org.springframework.http.HttpStatusCode::isError, clientResponse -> {
                        return clientResponse.bodyToMono(String.class).flatMap(errorBody -> {
                            log.error("NTS API Error Response: {}", errorBody);
                            return Mono.error(new RuntimeException("NTS API Error: " + errorBody));
                        });
                    })
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("data")) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
                if (data != null && !data.isEmpty()) {
                    String bStt = (String) data.get(0).get("b_stt");
                    if ("계속사업자".equals(bStt)) {
                        return new BusinessVerificationResponse(true, "유효한 사업자입니다.");
                    } else if ("휴업자".equals(bStt)) {
                        return new BusinessVerificationResponse(false, "휴업 중인 사업자입니다.");
                    } else if ("폐업자".equals(bStt)) {
                        return new BusinessVerificationResponse(false, "폐업한 사업자입니다.");
                    } else {
                        return new BusinessVerificationResponse(false, "유효하지 않은 사업자입니다. (" + bStt + ")");
                    }
                }
            }
            return new BusinessVerificationResponse(false, "사업자 정보를 찾을 수 없습니다.");
        } catch (Exception e) {
            log.error("Failed to verify business number: {}", e.getMessage());
            return new BusinessVerificationResponse(false, "공공데이터포털 API 연동 중 오류가 발생했습니다.");
        }
    }
}
