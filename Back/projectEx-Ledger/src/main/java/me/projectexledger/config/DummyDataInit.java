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
import me.projectexledger.domain.transaction.entity.Transaction;
import me.projectexledger.domain.transaction.entity.TransactionStatus;
import me.projectexledger.domain.transaction.repository.TransactionRepository;
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
    private final TransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("[DummyDataInit] 더미 데이터 초기화를 시작합니다...");

        initClients();
        initCompaniesAndMembers();
        initTransactions();
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
                .grade(ClientGrade.PARTNER)
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
        log.info("더미 가맹점(Client) 데이터 생성 완료");
    }

    private void initCompaniesAndMembers() {
        // ========== 1. Company 생성 (정상/대기/반려) ==========

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

        List<Member> membersToSave = new ArrayList<>();

        // ========== 2. 사이트 관리자 (Integrated Admin) ==========
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
            Member personalUser = Member.builder()
                    .email("user@example.com")
                    .password(passwordEncoder.encode("user1234!"))
                    .name("홍길동")
                    .role(Member.Role.ROLE_USER)
                    .build();
            personalUser.enableMfa(); // MFA 활성 상태 더미
            personalUser.updateTotpSecret("JBSWY3DPEHPK3PXP"); 
            personalUser.updateAccountInfo("Ex-Ledger", "EX-1004-111222", "홍길동");
            personalUser.getOrCreateWallet().updatePortOneInfo("imp_dummy_user_123");
            personalUser.getOrCreateWallet().addBalance(500000L); // 50만 원
            membersToSave.add(personalUser);
        }

        // [추가] 탈퇴 요청 중인 유저 (로그인 차단 및 유예 기간 UI 테스트용)
        if (!memberRepository.existsByEmail("leaving@example.com")) {
            Member leavingUser = Member.builder()
                    .email("leaving@example.com")
                    .password(passwordEncoder.encode("user1234!"))
                    .name("탈퇴예정자")
                    .role(Member.Role.ROLE_USER)
                    .build();
            leavingUser.requestWithdrawal(); // 현재 시간 기준 탈퇴 요청
            membersToSave.add(leavingUser);
        }

        // ========== 4. [정상 기업] 관리자 및 직원 ==========
        if (!memberRepository.existsByEmail("boss@exglobal.com")) {
            Member corpAdmin = Member.builder()
                    .email("boss@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("이사장")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyApproved)
                    .build();
            corpAdmin.approveCompany(); // 기업 연동 승인 상태로 생성
            corpAdmin.enableMfa(); // MFA 활성
            corpAdmin.updateTotpSecret("JBSWY3DPEHPK3PYQ"); // 기업 전용 시크릿
            corpAdmin.updateAccountInfo("Ex-Ledger", "EX-2003-999888", "이사장");
            companyApproved.activateAccount("EX-2003-999888");
            corpAdmin.getOrCreateWallet().updatePortOneInfo("imp_dummy_boss_456");
            corpAdmin.getOrCreateWallet().addBalance(2500000L); // 250만 원
            membersToSave.add(corpAdmin);
        }

        if (!memberRepository.existsByEmail("staff1@exglobal.com")) {
            Member corpStaff = Member.builder()
                    .email("staff1@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("김직원")
                    .role(Member.Role.ROLE_COMPANY_USER)
                    .company(companyApproved)
                    .build();
            corpStaff.approveCompany(); // 승인됨
            membersToSave.add(corpStaff);
        }

        // [추가] 미승인 기업 직원 (소속 승인 대기 UI 테스트용)
        if (!memberRepository.existsByEmail("staff2@exglobal.com")) {
            Member pendingStaff = Member.builder()
                    .email("staff2@exglobal.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("박대기")
                    .role(Member.Role.ROLE_COMPANY_USER)
                    .company(companyApproved)
                    .build();
            // approveCompany()를 호출하지 않아 isApproved = false 상태 유지
            membersToSave.add(pendingStaff);
        }

        // ========== 5. [심사 대기/반려 기업] 관리자 ==========
        if (!memberRepository.existsByEmail("ceo@startup.com")) {
            Member pendingAdmin = Member.builder()
                    .email("ceo@startup.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("최스타")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyPending)
                    .build();
            membersToSave.add(pendingAdmin);
        }

        if (!memberRepository.existsByEmail("fail@trade.com")) {
            Member rejectedAdmin = Member.builder()
                    .email("fail@trade.com")
                    .password(passwordEncoder.encode("test1234!"))
                    .name("강실패")
                    .role(Member.Role.ROLE_COMPANY_ADMIN)
                    .company(companyRejected)
                    .build();
            membersToSave.add(rejectedAdmin);
        }

        if (!membersToSave.isEmpty()) {
            memberRepository.saveAll(membersToSave);
        }
        log.info("더미 기업 및 멤버 데이터 생성 완료 (신규 생성: {}건)", membersToSave.size());
    }

    private void initTransactions() {
        if (transactionRepository.count() > 0) {
            log.info("Transaction 데이터가 이미 존재합니다. 스킵.");
            return;
        }

        List<Transaction> transactions = new ArrayList<>();
        
        // 1. 최고관리자 (최근 대액 충전 및 해외 송금 내역)
        memberRepository.findByEmail("admin@exledger.com").ifPresent(admin -> {
            transactions.add(Transaction.builder()
                    .member(admin).amount(new BigDecimal("5000000"))
                    .currency("KRW").type("CHARGE").title("지갑 잔액 충전")
                    .status(TransactionStatus.SETTLED).build());
            
            transactions.add(Transaction.builder()
                    .member(admin).amount(new BigDecimal("1500000"))
                    .currency("USD").type("TRANSFER").title("글로벌 수출 결제")
                    .description("미국 지사 송금").status(TransactionStatus.SETTLED).build());
        });

        // 2. 일반 유저 홍길동 (환전 및 개인 송금 내역)
        memberRepository.findByEmail("user@example.com").ifPresent(user -> {
            transactions.add(Transaction.builder()
                    .member(user).amount(new BigDecimal("200000"))
                    .currency("JPY").type("EXCHANGE").title("일본 여행 경비 환전")
                    .appliedRate(new BigDecimal("9.05")).status(TransactionStatus.EXCHANGE_COMPLETED).build());

            transactions.add(Transaction.builder()
                    .member(user).amount(new BigDecimal("50000"))
                    .currency("KRW").type("TRANSFER").title("지인 송금 (가족)")
                    .status(TransactionStatus.SETTLED).build());
        });

        // 3. 기업 관리자 이사장 (정산금 입금 내역 및 기업 활동 내역)
        memberRepository.findByEmail("boss@exglobal.com").ifPresent(boss -> {
            // 정산금 입금
            transactions.add(Transaction.builder()
                    .member(boss).amount(new BigDecimal("15200000"))
                    .currency("KRW").type("SETTLEMENT").title("2월 2주차 통합 정산금")
                    .status(TransactionStatus.SETTLED).build());

            // USD 환전
            transactions.add(Transaction.builder()
                    .member(boss).amount(new BigDecimal("5000000").negate())
                    .currency("USD").appliedRate(new BigDecimal("1320.50"))
                    .convertedAmount(new BigDecimal("3786.44"))
                    .status(TransactionStatus.EXCHANGE_COMPLETED)
                    .externalTransactionId("TX-DUMMY-1001")
                    .title("비즈니스 USD 환전 (매수)")
                    .type("EXCHANGE").category("BUSINESS").build());

            // 해외 송금
            transactions.add(Transaction.builder()
                    .member(boss).amount(new BigDecimal("15000").negate())
                    .currency("EUR").appliedRate(new BigDecimal("1450.20"))
                    .convertedAmount(new BigDecimal("21753000"))
                    .status(TransactionStatus.SETTLED)
                    .externalTransactionId("TX-DUMMY-1002")
                    .title("유럽 파트너사 대금 송금")
                    .type("TRANSFER").category("BUSINESS").build());
        });

        transactionRepository.saveAll(transactions);
        log.info("더미 거래 내역(Transaction) {}건 생성 완료", transactions.size());
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

        auditLogRepository.saveAll(List.of(log1, log2, log3));
        log.info("더미 AuditLog(감사로그) 생성 완료");
    }
}