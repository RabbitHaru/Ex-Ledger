package me.projectexledger.domain.transaction.entity;

public enum TransactionStatus {
    PENDING,            // 고객 요청 직후 (검토 중)
    EXCHANGE_COMPLETED, // 'C' 담당: 환전 및 원화 계산 완료
    SETTLED,            // 'A' 담당: 배치 정산 및 대사 완료 (최종 승인)
    FAILED,             // 정산 실패 (잔액 부족, API 오류 등)
    REFUNDED            // 환불 완료
}