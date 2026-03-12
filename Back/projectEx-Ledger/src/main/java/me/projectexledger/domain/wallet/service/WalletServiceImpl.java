package me.projectexledger.domain.wallet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.domain.wallet.entity.Wallet;
import me.projectexledger.domain.wallet.repository.WalletRepository;
import me.projectexledger.security.SecurityUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletServiceImpl implements WalletService {

    private final MemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final WalletRepository walletRepository;

    @Override
    @Transactional
    public Map<String, Object> activatePersonalAccount(String impUid) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email).orElseThrow();

        Wallet wallet = walletRepository.findByMember(member)
                .orElseGet(() -> walletRepository.save(Wallet.builder().member(member).build()));

        wallet.updatePortOneInfo(impUid);

        if (wallet.getAccountNumber() == null || wallet.getAccountNumber().isEmpty()) {
            String personalAccount = "PE-" + LocalDate.now() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
            wallet.updatePersonalAccount(personalAccount);
        }

        walletRepository.save(wallet);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("accountNumber", wallet.getAccountNumber());
        return response;
    }

    @Override
    public Map<String, Object> getWalletSummary() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 🌟 레포지토리 직접 조회를 통해 영속성 컨텍스트 에러 방지
        Wallet wallet = walletRepository.findByMember(member).orElse(null);
        Company company = member.getCompany();

        Map<String, Object> summary = new HashMap<>();

        // 1. 개인 지갑 정보 (안전한 HashMap 사용)
        Map<String, Object> personalInfo = new HashMap<>();
        personalInfo.put("accountNumber", (wallet != null && wallet.getAccountNumber() != null) ? wallet.getAccountNumber() : "");

        Map<String, Object> pBalances = new HashMap<>();
        pBalances.put("KRW", 0);
        personalInfo.put("balances", pBalances);
        summary.put("personal", personalInfo);

        // 2. 법인 지갑 정보 (🌟 Map.of를 HashMap으로 교체하여 null 에러 방지)
        if (company != null) {
            Map<String, Object> corporateInfo = new HashMap<>();
            corporateInfo.put("accountNumber", company.getCorporateAccountNumber() != null ? company.getCorporateAccountNumber() : "");
            corporateInfo.put("companyName", company.getCompanyName() != null ? company.getCompanyName() : "");

            Map<String, Object> cBalances = new HashMap<>();
            cBalances.put("KRW", company.getBalanceKrw());
            corporateInfo.put("balances", cBalances);

            summary.put("corporate", corporateInfo);
        } else {
            summary.put("corporate", null);
        }

        return summary;
    }

    @Override
    @Transactional
    public Map<String, Object> processCharge(Map<String, Object> request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Object amountObj = request.get("amount");
        String category = (String) request.get("category");
        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", orderId);
        response.put("amount", amountObj);
        response.put("clientKey", "test_ck_D53Qj7DraxzYzBaQ8nGwVzYpW9ex");
        response.put("customerName", member.getName());
        response.put("orderName", category.equals("PERSONAL") ? "개인 지갑 충전" : "법인 지갑 충전");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> activateCorporateMasterAccount() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Company company = member.getCompany();
        if (company == null) throw new IllegalArgumentException("소속된 기업 정보가 없습니다.");

        String newAccount = "EX-2003-" + (int)(Math.random() * 900000 + 100000);
        company.activateAccount(newAccount);

        Map<String, Object> result = new HashMap<>();
        result.put("accountNumber", newAccount);
        result.put("companyName", company.getCompanyName());
        return result;
    }
}