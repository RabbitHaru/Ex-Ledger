package me.projectexledger.domain.settlement.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SettlementStatus {
    // 승인 절차
    WAITING("승인 대기"),
    PENDING("송금 대기"),
    COMPLETED("정산 완료"),
    // 오류 발생
    WAITING_USER_CONSENT("유저 동의 대기"),// 내부 DB와 포트원 데이터가 다를 때 발생
    DISCREPANCY("오차 발생"),
    FAILED("송금 실패");

    private final String description;
}