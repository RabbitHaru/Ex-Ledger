package me.projectexledger.domain.member.repository;

import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);

    boolean existsByEmail(String email);

    // 기업 소속 + 승인 대기 중인 유저 조회
    List<Member> findByCompanyAndIsApprovedFalse(Company company);

    // 기업 소속 + 승인된 유저 조회
    List<Member> findByCompanyAndIsApprovedTrue(Company company);
}
