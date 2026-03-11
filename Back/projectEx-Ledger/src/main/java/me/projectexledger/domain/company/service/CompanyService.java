package me.projectexledger.domain.company.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.company.dto.JoinCompanyRequest;
import me.projectexledger.domain.company.dto.PendingUserResponse;
import me.projectexledger.domain.company.dto.CompanyUserResponse;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.security.SecurityUtil;
import me.projectexledger.domain.auth.service.EmailService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyService {
    private final MemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;

    @Transactional
    public void requestJoinCompany(JoinCompanyRequest request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Company company = companyRepository.findByBusinessNumber(request.getBusinessNumber())
                .orElseThrow(() -> new IllegalArgumentException("해당 사업자번호로 등록된 기업이 없습니다."));

        member.setCompany(company);
    }

    @Transactional(readOnly = true)
    public List<PendingUserResponse> getPendingUsers() {
        String adminEmail = SecurityUtil.getCurrentUserEmail();
        Member admin = memberRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

        Company company = admin.getCompany();
        if (company == null) {
            throw new IllegalArgumentException("기업 관리자의 소속 기업 정보가 없습니다.");
        }

        return memberRepository.findByCompanyAndIsApprovedFalse(company)
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

        if (admin.getCompany() == null || !admin.getCompany().getId().equals(
                user.getCompany() != null ? user.getCompany().getId() : null)) {
            throw new IllegalArgumentException("권한이 없는 사업자(기업)의 사용자입니다.");
        }

        if (user.isApproved()) {
            throw new IllegalArgumentException("이미 승인된 사용자입니다.");
        }

        user.approveCompany();
        emailService.sendApprovalEmail(user.getEmail(), user.getName(), "COMPANY_USER");
    }

    @Transactional(readOnly = true)
    public List<CompanyUserResponse> getCompanyUsers() {
        String adminEmail = SecurityUtil.getCurrentUserEmail();
        Member admin = memberRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

        Company company = admin.getCompany();
        if (company == null) {
            throw new IllegalArgumentException("소속 기업 정보가 없습니다.");
        }

        return memberRepository.findByCompanyAndIsApprovedTrue(company)
                .stream()
                .filter(m -> m.getRole() == Member.Role.ROLE_COMPANY_USER)
                .map(CompanyUserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeUser(Long userId) {
        String adminEmail = SecurityUtil.getCurrentUserEmail();
        Member admin = memberRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("관리자를 찾을 수 없습니다."));

        Member user = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("권한 박탈 대상 사용자를 찾을 수 없습니다."));

        if (admin.getCompany() == null || !admin.getCompany().getId().equals(
                user.getCompany() != null ? user.getCompany().getId() : null)) {
            throw new IllegalArgumentException("권한이 없는 사업자(기업)의 사용자입니다.");
        }

        user.revokeCompany();
    }

    @Transactional
    public void revokeMe() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.getRole() != Member.Role.ROLE_COMPANY_USER) {
            throw new IllegalArgumentException("실무자 권한을 가진 사용자만 소속 해제가 가능합니다.");
        }

        member.revokeCompany();
    }
}
