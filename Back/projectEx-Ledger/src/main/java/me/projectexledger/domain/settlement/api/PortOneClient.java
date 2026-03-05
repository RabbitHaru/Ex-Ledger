package me.projectexledger.domain.settlement.api;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.portone.Response.PortOnePaymentResponse;
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

        // 시크릿 키 공백 제거 및 헤더 고정 설정 (401 에러 방지)
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader("Authorization", "PortOne " + apiSecret.trim())
                .build();
    }

    // 결제 내역 조회 (정산 엔진용)

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

    public String getAccountHolder(String bankCode, String accountNo) {
        log.info("[PortOneClient] 예금주 조회 요청 - Bank: {}, Account: {}", bankCode, accountNo);

        try {
            // 🌟 포트원 V2 예금주 조회 엔드포인트 호출
            PortOneAccountResponse response = restClient.get()
                    .uri("/banks/{bankCode}/accounts/{accountNo}/holder", bankCode, accountNo)
                    .retrieve()
                    .body(PortOneAccountResponse.class);

            return (response != null) ? response.getHolderName() : null;
        } catch (Exception e) {
            log.error("❌ 포트원 예금주 조회 실패: {}", e.getMessage());
            throw new RuntimeException("계좌 실명 조회에 실패했습니다. 은행 코드와 계좌번호를 확인해주세요.");
        }
    }


    // 예금주 조회 응답을 받기 위한 내부 DTO

    @Getter
    @NoArgsConstructor
    public static class PortOneAccountResponse {
        private String holderName; // 포트원에서 반환하는 예금주 실명
    }
}