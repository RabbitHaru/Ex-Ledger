package me.projectexledger.domain.settlement.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SettlementStatus {
    WAITING("승인 대기"),
    PENDING("송금 대기"),
    IN_PROGRESS("송금 중"),
    COMPLETED("정산 완료"),
    FAILED("송금 실패"),
    DISCREPANCY("오차 발생"); // 내부 DB와 포트원 데이터가 다를 때 발생

    private final String description;
}