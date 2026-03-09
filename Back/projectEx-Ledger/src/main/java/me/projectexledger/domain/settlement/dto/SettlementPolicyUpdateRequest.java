package me.projectexledger.domain.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SettlementPolicyUpdateRequest {

    // 1. 플랫폼 중개 수수료율 (예: 1.5% -> 0.0150)
    private BigDecimal platformFeeRate;

    // 2. 국가별 고정 네트워크 수수료 (예: 2000원 -> 2000.00)
    private BigDecimal networkFee;

    // 3. 환전 스프레드 (가산금) (예: 달러당 10원 -> 10.0000)
    private BigDecimal exchangeSpread;

    // 4. 환율 우대율 (예: 90% 우대 -> 0.9000)
    private BigDecimal preferenceRate;

}