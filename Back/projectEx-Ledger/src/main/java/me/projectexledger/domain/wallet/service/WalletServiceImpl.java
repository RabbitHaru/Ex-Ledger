package me.projectexledger.domain.wallet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.company.entity.Company;
import me.projectexledger.domain.company.repository.CompanyRepository;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
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

    @Override
    @Transactional
    public Map<String, Object> activatePersonalAccount(String impUid) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        member.updatePortOneInfo(impUid);
        String personalAccount = "PE-" + LocalDate.now() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        member.assignPersonalAccount(personalAccount);

        log.info("✅ 개인 지갑 활성화 성공: 유저={}, 계좌={}", email, personalAccount);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("accountNumber", personalAccount);
        return response;
    }

    @Override
    public Map<String, Object> getWalletSummary() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Company company = member.getCompany();

        Map<String, Object> summary = new HashMap<>();
        Map<String, Object> personalInfo = new HashMap<>();
        personalInfo.put("accountNumber", member.getPersonalAccountNumber() != null ? member.getPersonalAccountNumber() : "");
        personalInfo.put("balances", Map.of("KRW", 0));
        summary.put("personal", personalInfo);

        if (company != null) {
            summary.put("corporate", Map.of(
                    "accountNumber", company.getCorporateAccountNumber() != null ? company.getCorporateAccountNumber() : "",
                    "companyName", company.getCompanyName(),
                    "balances", Map.of("KRW", company.getBalanceKrw())
            ));
        }
        return summary;
    }

    @Override
    @Transactional
    public Map<String, Object> activateCorporateMasterAccount() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email).orElseThrow();
        Company company = member.getCompany();
        if (company == null) throw new IllegalArgumentException("소속 기업이 없습니다.");

        String newAccount = "EX-2003-" + (int) (Math.random() * 900000 + 100000);
        company.activateAccount(newAccount);
        companyRepository.save(company);

        return Map.of("accountNumber", newAccount, "companyName", company.getCompanyName());
    }
}