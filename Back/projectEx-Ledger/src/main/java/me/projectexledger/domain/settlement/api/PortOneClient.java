package me.projectexledger.domain.settlement.api;

import lombok.extern.slf4j.Slf4j;
import me.projectexledger.infrastructure.external.portone.dto.PortOnePaymentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class PortOneClient {

    private final RestClient restClient;

    public PortOneClient(
            @Value("${external.portone.api-url}") String apiUrl,
            @Value("${portone.api.secret}") String apiSecret) {

        // 🚨 시크릿 키 공백 제거 및 헤더 고정 설정 (401 에러 원천 차단)
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "PortOne " + apiSecret.trim())
                .build();
    }

    public PortOnePaymentResponse getPayments(String from, String to, int page, int size) {
        log.info("[PortOneClient] 결제 내역 조회 요청 - From: {}", from);

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/payments")
                        // 🚨 포트원 V2 날짜 규격 강제 지정
                        .queryParam("from", from + "T00:00:00Z")
                        .queryParam("to", to + "T23:59:59Z")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .body(PortOnePaymentResponse.class);
    }
}