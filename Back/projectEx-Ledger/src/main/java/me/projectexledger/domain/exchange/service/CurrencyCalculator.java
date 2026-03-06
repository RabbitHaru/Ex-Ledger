package me.projectexledger.domain.exchange.service;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class CurrencyCalculator {

    /**
     * 최종 정산 금액(KRW) 계산 로직 (외화 -> KRW)
     * 이 메서드 이름이 SettlementEngineService가 호출하는 이름과 완벽히 일치합니다.
     */
    public BigDecimal calculateFinalSettlementAmount(
            BigDecimal foreignAmount,
            BigDecimal baseRate,
            String sourceCurrency,      // 결제된 외화 코드 (예: USD, JPY)
            BigDecimal platformFeeRate, // 플랫폼 수수료율 (예: 0.015)
            BigDecimal networkFee,      // 고정 전신료 (예: 2000)
            BigDecimal spread,          // 환전 마진 (예: 20.0)
            BigDecimal preferenceRate   // 환율 우대율 (예: 0.90)
    ) {
        // 1. 플랫폼 수수료 차감 (외화 원금에서 퍼센트로 차감)
        BigDecimal platformFee = foreignAmount.multiply(platformFeeRate);
        BigDecimal amountAfterPlatformFee = foreignAmount.subtract(platformFee);

        // 2. 가맹점 적용 환율 계산 (기준 환율에서 마진을 뺌)
        BigDecimal finalRate = calculateFinalRate(baseRate, spread, preferenceRate);

        // 3. 원화 환산 및 네트워크 전신료 차감
        // 공식: (수수료 차감 후 외화 * 낮은 적용환율) - 고정비용
        BigDecimal krwGrossAmount = amountAfterPlatformFee.multiply(finalRate);
        BigDecimal finalKrwAmount = krwGrossAmount.subtract(networkFee);

        // 4. 원화(KRW) 정산금은 소수점 없이 정수로 반올림 처리하여 반환
        return finalKrwAmount.setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * 가맹점 지급용 최종 환율 계산 (매입용)
     */
    public BigDecimal calculateFinalRate(BigDecimal baseRate, BigDecimal spread, BigDecimal preferenceRate) {
        // 우대율이 적용된 실제 마진
        BigDecimal appliedSpread = spread.multiply(BigDecimal.ONE.subtract(preferenceRate));

        // 🌟 핵심: 가맹점에게 원화를 줄 때는 기준 환율보다 '낮은' 환율을 적용해야 플랫폼이 돈을 법니다.
        return baseRate.subtract(appliedSpread);
    }
}