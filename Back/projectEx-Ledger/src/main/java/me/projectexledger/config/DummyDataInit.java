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
import java.util.ArrayList;
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
                .bankName("국민은행")
                .accountNumber("123456-01-123456")
                .merchantId("MCT-TEST-001")
                .grade(ClientGrade.GENERAL)
                .build();

        Client client2 = Client.builder()
                .name("(주)엑스레저글로벌")
                .businessNumber("987-65-43210")
                .status(ClientStatus.APPROVED)
                .bankName("신한은행")
                .accountNumber("110-123-456789")
                .merchantId("MCT-TEST-002")
                .build();

        Client client3 = Client.builder()
                .name("(주)글로벌무역")
                .businessNumber("111-22-33333")
                .status(ClientStatus.PENDING)
                .bankName("하나은행")
                .accountNumber("123-123456-12345")
                .merchantId("MCT-TEST-003")
                .grade(ClientGrade.GENERAL)
                .build();

        clientRepository.saveAll(List.of(client1, client2, client3));
        log.info("더미 Client(가맹점) 생성 완료");
    }

    private void initCompaniesAndMembers() {
        // ========== 1. Company 생성 ==========

        // [정상] 승인된 우량 기업
        Company companyApproved = companyRepository.findByBusinessNumber("9876543210")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("9876543210")
                        .companyName("(주)엑스레저글로벌")
                        .representative("이사장")
                        .adminApprovalStatus(AdminApprovalStatus.APPROVED)
                        .build()));

        // [대기] 신규 가입 심사 중인 스타트업
        Company companyPending = companyRepository.findByBusinessNumber("1234567890")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("1234567890")
                        .companyName("(주)스타트업A")
                        .representative("최스타")
                        .adminApprovalStatus(AdminApprovalStatus.PENDING)
                        .build()));

        // [반려] 서류 미비로 거절된 기업
        Company companyRejected = companyRepository.findByBusinessNumber("1112233333")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("1112233333")
                        .companyName("(주)실패무역")
                        .representative("강실패")
                        .adminApprovalStatus(AdminApprovalStatus.REJECTED)
                        .build()));

        // ========== 2. 사이트 관리자 (Integrated Admin) ==========
        List<Member> membersToSave = new ArrayList<>();
        if (!memberRepository.existsByEmail("admin@exledger.com")) {
            Member admin = Member.builder()
                    .email("admin@exledger.com")
                    .password(passwordEncoder.encode("admin123!"))
                    .name("최고관리자")
                    .role(Member.Role.ROLE_INTEGRATED_ADMIN)
                    .build();
            membersToSave.add(admin);
        }

        // ========== 3. 개인 유저 (Personal User) ==========
        if (!memberRepository.existsByEmail("user@example.com")) {
            Member user1 = Member.builder()
                    .email("user@example.com")
                    .password(passwordEncoder.encode("user1234!"))
                    .name("홍길동")
                    .role(Member.Role.ROLE_USER)
                    .build();
            membersToSave.add(user1);
        }

        if (!memberRepository.existsByEmail("member@test.com")) {
            Member user2 = Member.builder()
                    .email("member@test.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("김철수")
                    .role(Member.Role.ROLE_USER)
                    .build();
            membersToSave.add(user2);
        }

        // ========== 4. [정상 기업] 관리자 + 승인 직원 + 대기 직원 ==========
        if (!memberRepository.existsByEmail("boss@exglobal.com")) {
            Member corpAdmin = Member.builder()
                    .email("boss@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("이사장")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyApproved)
                    .build();
            corpAdmin.approveCompany();
            membersToSave.add(corpAdmin);
        } else {
            memberRepository.findByEmail("boss@exglobal.com").ifPresent(existing -> {
                existing.setCompany(companyApproved);
                existing.approveCompany();
            });
        }

        if (!memberRepository.existsByEmail("staff1@exglobal.com")) {
            Member corpStaffApproved = Member.builder()
                    .email("staff1@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("김직원")
                    .role(Member.Role.ROLE_COMPANY_USER)
                    .company(companyApproved)
                    .build();
            corpStaffApproved.approveCompany();
            membersToSave.add(corpStaffApproved);
        } else {
            memberRepository.findByEmail("staff1@exglobal.com").ifPresent(existing -> {
                existing.setCompany(companyApproved);
                existing.approveCompany();
            });
        }

        if (!memberRepository.existsByEmail("staff2@exglobal.com")) {
            Member corpStaffPending = Member.builder()
                    .email("staff2@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("박대기")
                    .role(Member.Role.ROLE_COMPANY_USER)
                    .company(companyApproved)
                    .build();
            corpStaffPending.updateAccountInfo(null, null, null);
            membersToSave.add(corpStaffPending);
        } else {
            memberRepository.findByEmail("staff2@exglobal.com").ifPresent(existing -> {
                existing.setCompany(companyApproved);
                existing.updateAccountInfo(null, null, null);
            });
        }

        // ========== 5. [심사 대기 기업] 관리자 ==========
        if (!memberRepository.existsByEmail("ceo@startup.com")) {
            Member pendingAdmin = Member.builder()
                    .email("ceo@startup.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("최스타")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyPending)
                    .build();
            pendingAdmin.updateAccountInfo(null, null, null);
            membersToSave.add(pendingAdmin);
        } else {
            memberRepository.findByEmail("ceo@startup.com").ifPresent(existing -> {
                existing.setCompany(companyPending);
                existing.updateAccountInfo(null, null, null);
            });
        }

        // ========== 6. [반려된 기업] 관리자 ==========
        if (!memberRepository.existsByEmail("fail@trade.com")) {
            Member rejectedAdmin = Member.builder()
                    .email("fail@trade.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("강실패")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyRejected)
                    .build();
            rejectedAdmin.updateAccountInfo(null, null, null);
            membersToSave.add(rejectedAdmin);
        } else {
            memberRepository.findByEmail("fail@trade.com").ifPresent(existing -> {
                existing.setCompany(companyRejected);
                existing.updateAccountInfo(null, null, null);
            });
        }

        if (!membersToSave.isEmpty()) {
            memberRepository.saveAll(membersToSave);
        }
        log.info("더미 Company 및 Member 데이터 재구성 완료 (추가 생성: {})", membersToSave.size());
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
