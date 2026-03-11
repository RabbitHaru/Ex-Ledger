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
        if (clientRepository.count() > 0) {
            log.info("Client 데이터가 이미 존재합니다. 스킵.");
            return;
        }

        Client client1 = Client.builder()
                .name("(주)테스트기업A")
                .businessNumber("123-45-67890")
                .status(ClientStatus.PENDING)
                .feeRate(new BigDecimal("0.0200"))
                .bankName("국민은행")
                .accountNumber("123456-01-123456")
                .preferenceRate(new BigDecimal("0.8000"))
                .merchantId("MCT-TEST-001")
                .grade(ClientGrade.GENERAL)
                .build();

        Client client2 = Client.builder()
                .name("(주)엑스레저글로벌")
                .businessNumber("987-65-43210")
                .status(ClientStatus.APPROVED)
                .feeRate(new BigDecimal("0.0100"))
                .bankName("신한은행")
                .accountNumber("110-123-456789")
                .preferenceRate(new BigDecimal("0.9000"))
                .merchantId("MCT-TEST-002")
                .networkFee(new BigDecimal("1500"))
                .exchangeSpread(new BigDecimal("8.00"))
                .grade(ClientGrade.VIP)
                .build();

        Client client3 = Client.builder()
                .name("(주)글로벌무역")
                .businessNumber("111-22-33333")
                .status(ClientStatus.PENDING)
                .feeRate(new BigDecimal("0.0150"))
                .bankName("하나은행")
                .accountNumber("123-123456-12345")
                .preferenceRate(new BigDecimal("0.8500"))
                .merchantId("MCT-TEST-003")
                .grade(ClientGrade.GENERAL)
                .build();

        clientRepository.saveAll(List.of(client1, client2, client3));
        log.info("더미 Client(가맹점) 생성 완료");
    }

    private void initCompaniesAndMembers() {
        if (memberRepository.findByEmail("admin@exledger.com").isPresent()) {
            log.info("Member 데이터가 이미 존재합니다. 스킵.");
            return;
        }

        // ========== Company 생성 ==========

        // 기업A: 승인 대기 (사업자 심사 테스트용)
        Company companyA = companyRepository.save(Company.builder()
                .businessNumber("1234567890")
                .companyName("(주)테스트기업A")
                .representative("김대표")
                .adminApprovalStatus(AdminApprovalStatus.PENDING)
                .build());

        // 기업B: 이미 승인됨 (정상 기업 테스트용)
        Company companyB = companyRepository.save(Company.builder()
                .businessNumber("9876543210")
                .companyName("(주)엑스레저글로벌")
                .representative("이사장")
                .adminApprovalStatus(AdminApprovalStatus.APPROVED)
                .build());

        // 기업C: 승인 대기
        Company companyC = companyRepository.save(Company.builder()
                .businessNumber("1112233333")
                .companyName("(주)글로벌무역")
                .representative("박매니저")
                .adminApprovalStatus(AdminApprovalStatus.PENDING)
                .build());

        // ========== 사이트 관리자 (기업 소속 없음) ==========
        Member admin = Member.builder()
                .email("admin@exledger.com")
                .password(passwordEncoder.encode("admin123!"))
                .name("최고관리자")
                .role(Member.Role.ROLE_INTEGRATED_ADMIN)
                .build();

        // ========== 개인 유저 (기업 소속 없음) ==========
        Member user1 = Member.builder()
                .email("user@example.com")
                .password(passwordEncoder.encode("user1234!"))
                .name("홍길동")
                .role(Member.Role.ROLE_USER)
                .build();

        Member user2 = Member.builder()
                .email("user2@example.com")
                .password(passwordEncoder.encode("user1234!"))
                .name("김철수")
                .role(Member.Role.ROLE_USER)
                .build();

        // ========== 기업A: 심사 대기 중인 기업 관리자 ==========
        Member companyAdminA = Member.builder()
                .email("ceo@testcompany.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("김대표")
                .role(Member.Role.ROLE_COMPANY_ADMIN)
                .company(companyA)
                .build();

        // ========== 기업B: 승인된 기업 관리자 + 소속 직원 ==========
        Member companyAdminB = Member.builder()
                .email("boss@exglobal.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("이사장")
                .role(Member.Role.ROLE_COMPANY_ADMIN)
                .company(companyB)
                .build();
        companyAdminB.approveCompany(); // 승인된 기업이므로 관리자도 승인 처리

        Member companyStaff1 = Member.builder()
                .email("staff1@exglobal.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("김직원")
                .role(Member.Role.ROLE_COMPANY_USER)
                .company(companyB)
                .build();
        companyStaff1.approveCompany(); // 승인된 직원

        Member companyStaff2 = Member.builder()
                .email("staff2@exglobal.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("박직원")
                .role(Member.Role.ROLE_COMPANY_USER)
                .company(companyB)
                .build();
        // 이 직원은 아직 승인 대기 상태

        // ========== 기업C: 심사 대기 관리자 ==========
        Member companyAdminC = Member.builder()
                .email("manager@globaltrade.com")
                .password(passwordEncoder.encode("test1234!"))
                .name("박매니저")
                .role(Member.Role.ROLE_COMPANY_ADMIN)
                .company(companyC)
                .build();

        memberRepository.saveAll(List.of(
                admin, user1, user2,
                companyAdminA,
                companyAdminB, companyStaff1, companyStaff2,
                companyAdminC
        ));
        log.info("더미 Company(기업) 및 Member(사용자) 생성 완료");
    }

    private void initAuditLogs() {
        if (auditLogRepository.count() > 0) {
            log.info("AuditLog 데이터가 이미 존재합니다. 스킵.");
            return;
        }

        SystemAuditLog log1 = SystemAuditLog.builder()
                .userEmail("admin@exledger.com")
                .action("GET /api/admin/dashboard/summary")
                .clientIp("127.0.0.1")
                .requestUri("/api/admin/dashboard/summary")
                .durationMs(45L)
                .build();

        SystemAuditLog log2 = SystemAuditLog.builder()
                .userEmail("user@example.com")
                .action("POST /api/auth/login")
                .clientIp("192.168.0.15")
                .requestUri("/api/auth/login")
                .durationMs(120L)
                .build();

        SystemAuditLog log3 = SystemAuditLog.builder()
                .userEmail("ceo@testcompany.com")
                .action("POST /api/auth/signup")
                .clientIp("10.0.0.5")
                .requestUri("/api/auth/signup")
                .durationMs(350L)
                .build();

        SystemAuditLog log4 = SystemAuditLog.builder()
                .userEmail("admin@exledger.com")
                .action("GET /api/admin/companies/pending")
                .clientIp("127.0.0.1")
                .requestUri("/api/admin/companies/pending")
                .durationMs(22L)
                .build();

        auditLogRepository.saveAll(List.of(log1, log2, log3, log4));
        log.info("더미 AuditLog(감사로그) 생성 완료");
    }
}
