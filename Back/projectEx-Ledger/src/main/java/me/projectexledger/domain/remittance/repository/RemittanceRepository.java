package me.projectexledger.domain.remittance.repository;

import me.projectexledger.domain.remittance.entity.Remittance;
import me.projectexledger.domain.remittance.entity.RemittanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RemittanceRepository extends JpaRepository<Remittance, Long> {

    // 특정 사용자의 송금 내역 조회
    List<Remittance> findAllByRequesterIdOrderByCreatedAtDesc(String requesterId);

    // 특정 상태의 송금 내역 조회 (어드민용)
    List<Remittance> findAllByStatusOrderByCreatedAtDesc(RemittanceStatus status);
}