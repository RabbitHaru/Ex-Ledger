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
        Company companyApproved = companyRepository.findByBusinessNumber("9876543210")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("9876543210")
                        .companyName("(주)엑스레저글로벌")
                        .representative("이사장")
                        .adminApprovalStatus(AdminApprovalStatus.APPROVED)
                        .build()));

        Company companyPending = companyRepository.findByBusinessNumber("1234567890")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("1234567890")
                        .companyName("(주)스타트업A")
                        .representative("최스타")
                        .adminApprovalStatus(AdminApprovalStatus.PENDING)
                        .build()));

        Company companyRejected = companyRepository.findByBusinessNumber("1112233333")
                .orElseGet(() -> companyRepository.save(Company.builder()
                        .businessNumber("1112233333")
                        .companyName("(주)실패무역")
                        .representative("강실패")
                        .adminApprovalStatus(AdminApprovalStatus.REJECTED)
                        .build()));

        // ========== 2. 핵심 계정 강제 업데이트 (존재 여부 상관없이 정보 동기화) ==========
        
        // [개인] 홍길동
        Member user = memberRepository.findByEmail("user@example.com").orElseGet(() -> 
            memberRepository.save(Member.builder()
                .email("user@example.com").password(passwordEncoder.encode("user1234!"))
                .name("홍길동").role(Member.Role.ROLE_USER).build()));
        
        user.updateAccountInfo("Ex-Ledger", "EX-1004-111222", "홍길동");
        user.getOrCreateWallet().updatePortOneInfo("imp_dummy_user_123");
        user.getOrCreateWallet().addBalance(500000L - user.getOrCreateWallet().getBalanceKrw()); // 50만 원 맞춤
        user.enableMfa();
        user.updateTotpSecret("JBSWY3DPEHPK3PXP");
        memberRepository.save(user);

        // [기업대표] 이사장
        Member boss = memberRepository.findByEmail("boss@exglobal.com").orElseGet(() ->
            memberRepository.save(Member.builder()
                .email("boss@exglobal.com").password(passwordEncoder.encode("test1234!"))
                .name("이사장").role(Member.Role.ROLE_COMPANY_ADMIN).company(companyApproved).build()));
        
        boss.approveCompany();
        boss.updateAccountInfo("Ex-Ledger", "EX-2003-999888", "이사장");
        boss.getOrCreateWallet().updatePortOneInfo("imp_dummy_boss_456");
        boss.getOrCreateWallet().addBalance(2500000L - boss.getOrCreateWallet().getBalanceKrw()); // 250만 원 맞춤
        boss.enableMfa();
        boss.updateTotpSecret("JBSWY3DPEHPK3PYQ");
        companyApproved.activateAccount("EX-2003-999888");
        memberRepository.save(boss);

        // [최고관리자]
        Member admin = memberRepository.findByEmail("admin@exledger.com").orElseGet(() ->
            memberRepository.save(Member.builder()
                .email("admin@exledger.com").password(passwordEncoder.encode("admin123!"))
                .name("최고관리자").role(Member.Role.ROLE_INTEGRATED_ADMIN).build()));
        memberRepository.save(admin);

        // ========== 3. 기타 보조 계정들 (기존 로직 유지) ==========
        List<Member> others = new ArrayList<>();
        if (!memberRepository.existsByEmail("leaving@example.com")) {
            Member m = Member.builder().email("leaving@example.com").password(passwordEncoder.encode("user1234!"))
                    .name("탈퇴예정자").role(Member.Role.ROLE_USER).build();
            m.requestWithdrawal(); others.add(m);
        }
        if (!memberRepository.existsByEmail("staff1@exglobal.com")) {
            Member m = Member.builder().email("staff1@exglobal.com").password(passwordEncoder.encode("test1234!"))
                    .name("김직원").role(Member.Role.ROLE_COMPANY_USER).company(companyApproved).build();
            m.approveCompany(); others.add(m);
        }
        if (!memberRepository.existsByEmail("ceo@startup.com")) {
            others.add(Member.builder().email("ceo@startup.com").password(passwordEncoder.encode("test1234!"))
                    .name("최스타").role(Member.Role.ROLE_COMPANY_ADMIN).company(companyPending).build());
        }
        if (!memberRepository.existsByEmail("fail@trade.com")) {
            others.add(Member.builder().email("fail@trade.com").password(passwordEncoder.encode("test1234!"))
                    .name("강실패").role(Member.Role.ROLE_COMPANY_ADMIN).company(companyRejected).build());
        }
        memberRepository.saveAll(others);
        
        log.info("더미 데이터 동기화 완료 (Fast-Path 적용 계정 포함)");
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