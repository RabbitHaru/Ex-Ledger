package me.projectexledger.domain.company.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.company.dto.JoinCompanyRequest;
import me.projectexledger.domain.company.dto.PendingUserResponse;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.security.SecurityUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyService {
    private final MemberRepository memberRepository;

    @Transactional
    public void requestJoinCompany(JoinCompanyRequest request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        member.requestCompanyApproval(request.getBusinessNumber());
    }

    @Transactional(readOnly = true)
    public List<PendingUserResponse> getPendingUsers() {
        String adminEmail = SecurityUtil.getCurrentUserEmail();
        Member admin = memberRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

        String adminBusinessNumber = admin.getBusinessNumber();
        if (adminBusinessNumber == null || adminBusinessNumber.isEmpty()) {
            throw new IllegalArgumentException("기업 관리자의 사업자 번호가 설정되어 있지 않습니다.");
        }

        return memberRepository.findByBusinessNumberAndIsApprovedFalse(adminBusinessNumber)
                .stream()
                .map(PendingUserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void approveUser(Long userId) {
        String adminEmail = SecurityUtil.getCurrentUserEmail();
        Member admin = memberRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

        Member user = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("승인 대상 사용자를 찾을 수 없습니다."));

        if (!admin.getBusinessNumber().equals(user.getBusinessNumber())) {
            throw new IllegalArgumentException("권한이 없는 사업자(기업)의 사용자입니다.");
        }

        if (user.isApproved()) {
            throw new IllegalArgumentException("이미 승인된 사용자입니다.");
        }

        user.approveCompany();
    }
}
