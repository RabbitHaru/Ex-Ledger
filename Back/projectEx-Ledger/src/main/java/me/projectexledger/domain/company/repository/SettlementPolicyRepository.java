package me.projectexledger.domain.company.repository;

import me.projectexledger.domain.company.entity.SettlementPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettlementPolicyRepository extends JpaRepository<SettlementPolicy, Long> {
    // 가맹점 ID로 정책을 조회하는 쿼리 메서드
    Optional<SettlementPolicy> findByMerchantId(String merchantId);
}