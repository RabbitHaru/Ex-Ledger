package me.projectexledger.domain.settlement.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SettlementStatus {
    // 🌟 승인 절차 (UI 명칭에 맞춰 description 수정)
    WAITING("승인 대기"),
    PENDING("정산 중"),      // 기존 "송금 대기"에서 UI 명칭인 "정산 중"으로 통일
    COMPLETED("정산 완료"),

    // 추적 프로세스 상태값
    REVIEWING("검토 중"),
    EXCHANGED("환전 완료"),
    IN_PROGRESS("해외 송금 중"),

    // 오류 및 특수 상태
    WAITING_USER_CONSENT("유저 동의 대기"), // 내부 DB와 포트원 데이터가 다를 때 발생

    // 🌟 구분 완료
    FAILED("송금 실패"),    // 은행망 전송 실패 등 기술적 오류
    REJECTED("정산 반려");  // 관리자가 명시적으로 거절함

    private final String description;
}