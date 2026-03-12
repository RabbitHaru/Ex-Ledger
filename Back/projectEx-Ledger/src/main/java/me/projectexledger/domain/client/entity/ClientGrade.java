package me.projectexledger.domain.client.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ClientGrade {
    // 🌟 틀만 관리하며, 실제 수치는 DB(SettlementPolicy)가 주인입니다.
    GENERAL("일반"),
    PARTNER("파트너"); // VIP -> PARTNER 명칭 변경

    private final String description;
}