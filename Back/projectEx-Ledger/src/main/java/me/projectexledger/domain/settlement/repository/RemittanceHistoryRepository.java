package me.projectexledger.domain.settlement.repository;

import me.projectexledger.domain.settlement.entity.RemittanceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RemittanceHistoryRepository extends JpaRepository<RemittanceHistory, Long> {
}