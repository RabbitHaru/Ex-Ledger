package me.projectexledger.domain.payment.entity;

/**
 * 결제 및 송금 진행 상태
 */
public enum PaymentStatus {
    REQUESTED,   // 송금/결제 신청됨
    COMPLETED,   // 외부 결제 완료됨 (정산 대상)
    FAILED       // 결제 실패
}