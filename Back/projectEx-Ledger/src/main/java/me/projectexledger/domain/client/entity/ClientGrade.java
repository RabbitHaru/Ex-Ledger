package me.projectexledger.domain.client.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ClientGrade {
    // 🌟 등급별 혜택 패키지 정의
    GENERAL("일반", 0.015, 2000, 10.0, 0.90), // 수수료 1.5%, 전신료 2천원, 마진 10원, 우대 90%
    VIP("VIP", 0.005, 0, 2.0, 1.0);           // 수수료 0.5%, 전신료 면제, 마진 2원, 우대 100%

    private final String description;
    private final double defaultFeeRate;      // 플랫폼 수수료 (platformFeeRate)
    private final int defaultNetworkFee;      // 네트워크/전신료 (networkFee)
    private final double defaultExchangeSpread; // 환전 마진 (exchangeSpread)
    private final double defaultPreferenceRate; // 환율 우대율 (preferenceRate)
}