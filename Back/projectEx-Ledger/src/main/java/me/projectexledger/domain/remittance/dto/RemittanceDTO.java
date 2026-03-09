package me.projectexledger.domain.remittance.dto;

import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;

public class RemittanceDTO {

    // 📥 [요청 DTO] C님이 리액트에서 A님께 던져줄 데이터 구조
    @Getter
    public static class Request {
        private String recipientName;    // 수취인 실명
        private String recipientBank;    // 수취 은행 코드/명
        private String recipientAccount; // 수취 계좌 번호
        private String currency;         // 송금 통화 코드 (예: "USD")
        private BigDecimal amount;       // 송금할 외화 금액
        private BigDecimal exchangeRate; // 신청 당시 적용 환율
        private BigDecimal feeAmount;    // 계산된 수수료 (KRW)
        private BigDecimal totalPayment; // 최종 결제 원화 금액
    }

    // 📤 [응답 DTO] A님이 처리를 마치고 C님께 돌려줄 결과
    @Getter
    @Builder
    public static class Response {
        private String transactionId; // 송금 고유 거래 번호
        private String status;        // 현재 송금 상태
        private String requestedAt;   // 신청 일시
    }
    // 📊 [목록 응답 DTO] 어드민 대시보드 리스트에서 보여줄 요약 데이터
    @Getter
    @Builder
    public static class ListResponse {
        private Long id;                       // 송금 고유 ID (DB PK)
        private String requesterId;            // 신청자 ID
        private String receiverName;           // 수취인 실명
        private BigDecimal krwAmount;          // 결제한 원화 총액
        private BigDecimal foreignCurrencyAmount; // 송금될 외화 금액
        private String currency;               // 통화 (USD 등)
        private String status;                 // 현재 상태 (REQUESTED, PENDING 등)
        private String requestedAt;            // 신청 일시
    }
}