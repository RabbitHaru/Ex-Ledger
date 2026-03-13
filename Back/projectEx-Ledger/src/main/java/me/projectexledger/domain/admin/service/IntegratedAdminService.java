package me.projectexledger.domain.admin.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.admin.dto.PendingCompanyAdminResponse;
import me.projectexledger.domain.auth.service.EmailService;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IntegratedAdminService {

    private final MemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final EmailService emailService;

    @Value("${app.upload.dir:${user.home}/.exledger/uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public List<PendingCompanyAdminResponse> getPendingCompanyAdmins() {
        // PENDING 상태의 Company를 조회하고, 각 Company에 소속된 COMPANY_ADMIN 멤버를 찾음
        return companyRepository.findByAdminApprovalStatus(AdminApprovalStatus.PENDING)
                .stream()
                .flatMap(company -> memberRepository.findByCompanyAndIsApprovedFalse(company).stream()
                        .filter(m -> m.getRole() == Member.Role.ROLE_COMPANY_ADMIN)
                        .map(PendingCompanyAdminResponse::from))
                .collect(Collectors.toList());
    }

    @Transactional
    public void approveCompanyAdmin(Long userId) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.getRole() != Member.Role.ROLE_COMPANY_ADMIN) {
            throw new IllegalArgumentException("기업 관리자 권한을 요청한 사용자가 아닙니다.");
        }

        Company company = member.getCompany();
        if (company == null) {
            throw new IllegalArgumentException("소속 기업 정보가 없습니다.");
        }

        if (company.getAdminApprovalStatus() == AdminApprovalStatus.APPROVED) {
            throw new IllegalArgumentException("이미 승인된 기업 관리자입니다.");
        }

        company.approveByAdmin();
        member.approveCompany();

        emailService.sendApprovalEmail(member.getEmail(), member.getName(), "COMPANY_ADMIN");
    }

    @Transactional
    public void rejectCompanyAdmin(Long userId) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.getRole() != Member.Role.ROLE_COMPANY_ADMIN) {
            throw new IllegalArgumentException("기업 관리자 권한을 요청한 사용자가 아닙니다.");
        }

        Company company = member.getCompany();
        if (company != null) {
            company.rejectByAdmin();
        }
    }

    @Transactional(readOnly = true)
    public List<me.projectexledger.domain.admin.dto.AdminMemberResponse> getAllMembers() {
        return memberRepository.findAll()
                .stream()
                .map(me.projectexledger.domain.admin.dto.AdminMemberResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateMemberRole(Long userId, Member.Role newRole) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        member.updateRole(newRole);
    }

    @Transactional
    public void updateMemberApproval(Long userId, boolean isApproved) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        member.setApproved(isApproved);
    }

    @Transactional
    public void deleteMember(Long userId) {
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        memberRepository.delete(member);
    }

    public Resource loadLicenseFileAsResource(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new IllegalArgumentException("파일을 읽을 수 없습니다: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new IllegalArgumentException("파일 경로가 잘못되었습니다: " + fileName, ex);
        }
    }
}
