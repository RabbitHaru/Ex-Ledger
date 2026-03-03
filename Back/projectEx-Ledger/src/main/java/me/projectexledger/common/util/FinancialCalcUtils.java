package me.projectexledger.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class FinancialCalcUtils {

    // 🌟 원화 환산 공식: 외화 * 환율
    public static BigDecimal convertToKrw(BigDecimal foreignAmount, BigDecimal rate) {
        if (foreignAmount == null || rate == null) return BigDecimal.ZERO;

        // 정산 플랫폼 표준: 소수점 이하 반올림 (HALF_UP)
        return foreignAmount.multiply(rate).setScale(0, RoundingMode.HALF_UP);
    }

    // 🌟 수수료 계산 로직 (예: 0.5% 고정 - 나중에 정책에 따라 변경 가능)
    public static BigDecimal calculateFee(BigDecimal krwAmount) {
        BigDecimal feeRate = new BigDecimal("0.005");
        return krwAmount.multiply(feeRate).setScale(0, RoundingMode.FLOOR);
    }
}