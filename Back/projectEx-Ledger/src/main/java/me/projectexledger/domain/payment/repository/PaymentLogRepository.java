package me.projectexledger.domain.payment.repository;

import me.projectexledger.domain.payment.entity.PaymentLog;
import me.projectexledger.domain.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentLogRepository extends JpaRepository<PaymentLog, Long> {

    // 1. 대사(Reconciliation)를 위한 주문번호 조회
    Optional<PaymentLog> findByOrderId(String orderId);

    // 2. 대시보드용 전체 결제 합계 집계
    @Query("SELECT SUM(p.amount) FROM PaymentLog p WHERE p.status = :status")
    BigDecimal sumTotalAmountByStatus(PaymentStatus status);

    // 3. 상태별 결제 내역 조회 (대기/성공/실패)
    List<PaymentLog> findByStatus(PaymentStatus status);

    long countByStatus(PaymentStatus status);
}