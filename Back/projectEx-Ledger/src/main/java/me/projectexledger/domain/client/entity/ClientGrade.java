package me.projectexledger.domain.client.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ClientGrade {
    GENERAL("일반", 0.015), // 기본 수수료 1.5%
    VIP("VIP", 0.005);    // 우대 수수료 0.5%

    private final String description;
    private final double defaultFeeRate;
}