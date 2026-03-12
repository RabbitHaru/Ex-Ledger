package me.projectexledger.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.audit.entity.SystemAuditLog;
import me.projectexledger.domain.audit.repository.SystemAuditLogRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientGrade;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.AdminApprovalStatus;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class DummyDataInit implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final ClientRepository clientRepository;
    private final SystemAuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("[DummyDataInit] 더미 데이터 초기화를 시작합니다...");
        initClients();
        initCompaniesAndMembers();
        initAuditLogs();
        log.info("[DummyDataInit] 더미 데이터 초기화 완료!");
    }

    private void initClients() {
        if (clientRepository.count() > 0) return;
        Client client2 = Client.builder()
                .name("(주)엑스레저글로벌")
                .businessNumber("987-65-43210")
                .status(ClientStatus.APPROVED)
                .feeRate(new BigDecimal("0.0100"))
                .merchantId("MCT-TEST-002")
                .grade(ClientGrade.VIP)
                .build();
        clientRepository.save(client2);
    }

    private void initCompaniesAndMembers() {
        if (memberRepository.findByEmail("admin@exledger.com").isPresent()) return;

        Company companyB = companyRepository.save(Company.builder()
                .businessNumber("9876543210")
                .companyName("(주)엑스레저글로벌")
                .representative("이사장")
                .adminApprovalStatus(AdminApprovalStatus.APPROVED)
                .build());

        Member admin = Member.builder()
                .email("admin@exledger.com")
                .password(passwordEncoder.encode("admin123!"))
                .name("최고관리자")
                .role(Member.Role.ROLE_INTEGRATED_ADMIN)
                .build();

        Member user1 = Member.builder()
                .email("user@example.com")
                .password(passwordEncoder.encode("user1234!"))
                .name("홍길동")
                .role(Member.Role.ROLE_USER)
                .build();

        Member companyAdminB = Member.builder()
                .email("boss@exglobal.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("이사장")
                .role(Member.Role.ROLE_COMPANY_ADMIN)
                .company(companyB)
                .build();
        companyAdminB.approveCompany();

        memberRepository.saveAll(List.of(admin, user1, companyAdminB));
    }

    private void initAuditLogs() {
        if (auditLogRepository.count() > 0) return;
        SystemAuditLog log1 = SystemAuditLog.builder()
                .userEmail("admin@exledger.com")
                .action("GET /api/admin/dashboard/summary")
                .clientIp("127.0.0.1")
                .requestUri("/api/admin/dashboard/summary")
                .durationMs(45L)
                .build();
        auditLogRepository.save(log1);
    }
}