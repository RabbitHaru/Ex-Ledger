package me.projectexledger.domain.remittance.dto;

import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;
import java.math.RoundingMode;

public class FeeDTO {

    // 📥 프론트엔드에서 금액을 입력할 때마다 백엔드로 보낼 데이터
    @Getter
    public static class Request {
        private BigDecimal amount;       // 송금할 외화 금액 (예: 1000 USD)
        private String currency;         // 통화 코드
        private BigDecimal exchangeRate; // 현재 적용 환율
        private String clientGrade; // 고객 등급
    }

    // 📤 백엔드가 계산해서 프론트엔드로 돌려줄 수수료 상세 내역
    @Getter
    @Builder
    public static class Response {
        private BigDecimal baseKrwAmount;  // 순수 환전 원화 금액 (외화 * 환율)
        private BigDecimal telegraphicFee; // 전신료 (고정비)
        private BigDecimal processingFee;  // 송금 수수료 (비율제)
        private BigDecimal totalFeeAmount; // 수수료 총합
        private BigDecimal totalPayment;   // 최종 고객 결제 원화 금액
    }
}