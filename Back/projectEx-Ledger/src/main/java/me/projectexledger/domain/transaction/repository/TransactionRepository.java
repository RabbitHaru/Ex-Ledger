package me.projectexledger.domain.transaction.repository;

import me.projectexledger.domain.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // 담당자 C의 핵심: 특정 사용자의 거래 내역을 최신순으로 조회
    List<Transaction> findByUserIdOrderByCreatedAtDesc(String userId);
}