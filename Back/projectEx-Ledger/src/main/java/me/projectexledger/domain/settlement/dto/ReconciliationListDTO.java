package me.projectexledger.domain.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 정산 대조 리스트 데이터 전송 객체
 * ReconciliationList.tsx 화면의 테이블 한 행(Row)에 들어갈 데이터입니다.
 */
@Getter
@Builder
@NoArgsConstructor // 안전한 직렬화/역직렬화를 위한 기본 생성자
@AllArgsConstructor // Builder 패턴이 정상 동작하기 위한 전체 생성자
public class ReconciliationListDTO {
    private Long id;
    private String orderId;          // 포트원 대조용 주문번호
    private String clientName;       // 기업명

    // 🌟 [추가] 프론트엔드로 넘겨줄 은행/계좌 정보!
    private String bankName;
    private String accountNumber;

    // 🌟 [수정] 타입을 ClientGrade에서 String으로 변경하여 빨간 줄을 해결합니다.
    private String grade;

    private String merchantId;

    private BigDecimal amount;       // 내부 DB 결제 원금 (정산 시스템 필수 타입)
    private BigDecimal originalAmount;
    private BigDecimal settlementAmount;
    private String status;           // 내부 결제 상태 (COMPLETED, FAILED 등)
    private String updatedAt;
}