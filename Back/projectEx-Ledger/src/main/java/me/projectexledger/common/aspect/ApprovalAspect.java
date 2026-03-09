package me.projectexledger.common.aspect;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.security.SecurityUtil;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class ApprovalAspect {

    private final MemberRepository memberRepository;

    @Before("@annotation(me.projectexledger.common.annotation.RequireCompanyApproval) || @within(me.projectexledger.common.annotation.RequireCompanyApproval)")
    public void checkCompanyApproval() {
        String email = SecurityUtil.getCurrentUserEmail();

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("인증된 사용자 정보를 찾을 수 없습니다."));

        if (!member.isApproved()) {
            throw new AccessDeniedException("소속 기업 관리자의 승인이 필요합니다. (Company Approval Required)");
        }
    }
}
