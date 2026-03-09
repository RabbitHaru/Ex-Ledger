package me.projectexledger.domain.settlement.repository;

import me.projectexledger.domain.settlement.entity.Settlement;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Page<Settlement> findByClientName(String clientName, Pageable pageable);
    // 1. [필수] 멱등성 보장: 중복 동기화 방지용
    boolean existsByOrderId(String orderId);

    // 2. 상태별 목록 조회
    List<Settlement> findByStatus(SettlementStatus status);

    // 3. [대시보드용] 정산 완료된 총 금액 합계
    // 🚨 시니어 수정: amount(원천 결제금)가 아니라 settlementAmount(환율/수수료 적용 후 최종 정산액)를 합산해야 회계가 맞습니다.
    @Query("SELECT SUM(s.settlementAmount) FROM Settlement s WHERE s.status = :status")
    BigDecimal sumTotalSettlementAmountByStatus(@Param("status") SettlementStatus status);

    // 4. [대시보드용] 특정 상태의 건수 카운트
    long countByStatus(SettlementStatus status);

    @Query("SELECT SUM(s.settlementAmount) FROM Settlement s " +
            "WHERE s.clientName = :clientName " +
            "AND s.updatedAt >= :startDate")
    BigDecimal sumMonthlyAmount(@Param("clientName") String clientName,
                                @Param("startDate") LocalDateTime startDate);
}