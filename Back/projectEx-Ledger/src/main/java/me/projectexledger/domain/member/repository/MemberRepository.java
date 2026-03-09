package me.projectexledger.domain.member.repository;

import me.projectexledger.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);

    boolean existsByEmail(String email);

    // 사업자 번호로 승인 대기 중인(isApproved=false) 유저 조회
    List<Member> findByBusinessNumberAndIsApprovedFalse(String businessNumber);
}
