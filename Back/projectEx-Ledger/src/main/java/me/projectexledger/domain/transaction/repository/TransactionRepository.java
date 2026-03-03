package me.projectexledger.domain.transaction.repository;

import me.projectexledger.domain.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByMemberEmailOrderByCreatedAtDesc(String email);
}