package me.projectexledger.domain.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 회원 탈퇴 유예 기간(7일)이 만료된 계정을 실제로 삭제하는 스케줄러
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WithdrawalCleanupTask {

    private final MemberRepository memberRepository;

    @Value("${withdrawal.grace-period-days:30}")
    private long gracePeriodDays;

    // 매일 새벽 3시에 실행
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredWithdrawals() {
        log.info("Starting withdrawal cleanup task...");
        
        LocalDateTime expiryThreshold = LocalDateTime.now().minusDays(gracePeriodDays);
        List<Member> expiredMembers = memberRepository.findByWithdrawalRequestedAtBefore(expiryThreshold);
        
        if (expiredMembers.isEmpty()) {
            log.info("No expired withdrawal requests found.");
            return;
        }

        log.info("Found {} expired withdrawal requests. Deleting...", expiredMembers.size());
        
        for (Member member : expiredMembers) {
            try {
                if (member.getRole() == Member.Role.ROLE_INTEGRATED_ADMIN) {
                    continue;
                }
                // 탈퇴 시 추가적인 정리 로직이 필요하면 여기에 구현 (예: 파일 삭제 등)
                log.info("Deleting member: {}", member.getEmail());
                memberRepository.delete(member);
            } catch (Exception e) {
                log.error("Failed to delete member {}: {}", member.getEmail(), e.getMessage());
            }
        }
        
        log.info("Withdrawal cleanup task completed.");
    }
}
