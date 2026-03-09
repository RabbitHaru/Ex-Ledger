package me.projectexledger.domain.client.entity;

/**
 *  기업 고객의 서비스 이용 상태
 */
public enum ClientStatus {
    PENDING,    // 승인 대기
    APPROVED,   // 승인 완료 (정산 가능 상태)
    REJECTED    // 가입 거절
}