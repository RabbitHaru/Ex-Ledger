package me.projectexledger.domain.remittance.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RemittanceStatus {
    PENDING("송금 대기"),
    COMPLETED("정산 완료"),
    WAITING("승인 대기"),
    FAILED("송금 실패"),
    DISCREPANCY("오차 발생"),
    WAITING_USER_CONSENT("유저 동의 대기"); // 관리자 수정 후 유저 동의 대기 상태

    private final String description;
}