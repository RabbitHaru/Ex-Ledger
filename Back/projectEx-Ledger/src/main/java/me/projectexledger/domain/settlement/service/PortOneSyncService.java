package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.util.ReconciliationUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 포트원 V2 API와 통신하여 결제 데이터를 동기화하는 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortOneSyncService {

    private final WebClient webClient = WebClient.builder().baseUrl("https://api.portone.io").build();

    @Value("${PORTONE_API_SECRET}")
    private String portOneSecret; // 포트원 V2는 API Secret 하나로 인증 가능합니다

    /**
     * 특정 날짜의 포트원 결제 내역을 가져와서 우리 규격(ExternalTxDto)으로 변환합니다.
     */
    public List<ReconciliationUtil.ExternalTxDto> fetchExternalPayments(LocalDate date) {
        log.info("포트원 V2 결제 내역 동기화 시작: {}", date);

        // 실제 현업에서는 페이지네이션 처리가 필요하지만, 테스트용으로 리스트 조회 예시를 작성합니다.
        // V2 API: GET /payments?from={start}&to={end}
        PortOneV2Response response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/payments")
                        .queryParam("from", date.atStartOfDay())
                        .queryParam("to", date.plusDays(1).atStartOfDay())
                        .build())
                .header("Authorization", "PortOne " + portOneSecret)
                .retrieve()
                .bodyToMono(PortOneV2Response.class)
                .block();

        if (response == null || response.getItems() == null) {
            return List.of();
        }

        // 포트원 데이터를 우리 유틸리티가 인식할 수 있는 ExternalTxDto로 매핑합니다
        return response.getItems().stream()
                .map(item -> new PortOneExternalDto(
                        item.getPaymentId(), // 포트원의 고유 ID
                        item.getAmount().getTotal() // 최종 결제 금액 (과세 포함)
                ))
                .collect(Collectors.toUnmodifiableList());
    }

    // 포트원 V2 응답을 받기 위한 내부 DTO (V2 규격 반영)
    private static class PortOneV2Response {
        private List<PaymentItem> items;
        public List<PaymentItem> getItems() { return items; }

        static class PaymentItem {
            private String id; // 결제 ID
            private Amount amount;
            public String getPaymentId() { return id; }
            public Amount getAmount() { return amount; }

            static class Amount {
                private BigDecimal total;
                public BigDecimal getTotal() { return total; }
            }
        }
    }

    // ReconciliationUtil과 호환되는 구현체
    private static class PortOneExternalDto implements ReconciliationUtil.ExternalTxDto {
        private final String txId;
        private final BigDecimal amount;

        public PortOneExternalDto(String txId, BigDecimal amount) {
            this.txId = txId;
            this.amount = amount;
        }

        @Override public String getTransactionId() { return txId; }
        @Override public BigDecimal getAmount() { return amount; }
    }
}