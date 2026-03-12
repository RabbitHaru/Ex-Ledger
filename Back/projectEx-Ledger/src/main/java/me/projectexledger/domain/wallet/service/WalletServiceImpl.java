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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import me.projectexledger.domain.transaction.repository.TransactionRepository;
import me.projectexledger.domain.transaction.entity.Transaction;
import me.projectexledger.domain.transaction.entity.TransactionStatus;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletServiceImpl implements WalletService {

    private final MemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    @Override
    @Transactional
    public Map<String, Object> activatePersonalAccount(String impUid) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        Wallet wallet = walletRepository.findByMember(member)
                .orElseGet(() -> walletRepository.save(Wallet.builder().member(member).build()));

        wallet.updatePortOneInfo(impUid);

        if (wallet.getAccountNumber() == null || wallet.getAccountNumber().isEmpty()) {
            String personalAccount = "EX-1004-" + (int)(Math.random() * 900000 + 100000);
            wallet.updatePersonalAccount(personalAccount);
        }

        walletRepository.save(wallet);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("accountNumber", wallet.getAccountNumber());
        response.put("realName", member.getName()); // Fix for UNDEFINED sender receipt bug
        return response;
    }

    @Override
    public Map<String, Object> getWalletSummary() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Wallet wallet = walletRepository.findByMember(member).orElse(null);
        Company company = member.getCompany();

        Map<String, Object> summary = new HashMap<>();

        Map<String, Object> personalInfo = new HashMap<>();
        personalInfo.put("accountNumber", (wallet != null && wallet.getAccountNumber() != null) ? wallet.getAccountNumber() : "");

        Map<String, Object> pBalances = new HashMap<>();
        pBalances.put("KRW", (wallet != null && wallet.getBalanceKrw() != null) ? wallet.getBalanceKrw() : 0);
        pBalances.put("USD", (wallet != null && wallet.getBalanceUsd() != null) ? wallet.getBalanceUsd() : 0);
        pBalances.put("EUR", (wallet != null && wallet.getBalanceEur() != null) ? wallet.getBalanceEur() : 0);
        pBalances.put("JPY", (wallet != null && wallet.getBalanceJpy() != null) ? wallet.getBalanceJpy() : 0);
        personalInfo.put("balances", pBalances);
        summary.put("personal", personalInfo);

        if (company != null) {
            Map<String, Object> corporateInfo = new HashMap<>();
            corporateInfo.put("accountNumber", company.getCorporateAccountNumber() != null ? company.getCorporateAccountNumber() : "");
            corporateInfo.put("companyName", company.getCompanyName() != null ? company.getCompanyName() : "");

            Map<String, Object> cBalances = new HashMap<>();
            cBalances.put("KRW", company.getBalanceKrw());
            cBalances.put("USD", company.getBalanceUsd());
            cBalances.put("EUR", company.getBalanceEur());
            cBalances.put("JPY", company.getBalanceJpy());
            corporateInfo.put("balances", cBalances);

            summary.put("corporate", corporateInfo);
        } else {
            summary.put("corporate", null);
        }

        List<Transaction> txsList = transactionRepository.findByMemberEmailOrderByCreatedAtDesc(email);
        List<Map<String, Object>> mappedTxs = new ArrayList<>();
        for (Transaction t : txsList) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId().toString());
            map.put("date", t.getCreatedAt() != null ? t.getCreatedAt().toString() : java.time.LocalDateTime.now().toString());
            map.put("currency", t.getCurrency());
            map.put("amount", t.getAmount());
            map.put("rate", t.getAppliedRate());
            map.put("finalKrw", t.getConvertedAmount());
            map.put("status", "COMPLETED");
            map.put("title", t.getTitle() != null ? t.getTitle() : t.getDescription());
            map.put("type", t.getType() != null ? t.getType() : "TRANSFER");
            map.put("category", t.getCategory() != null ? t.getCategory() : "PERSONAL");
            mappedTxs.add(map);
        }
        summary.put("transactions", mappedTxs);

        return summary;
    }

    @Override
    @Transactional
    public Map<String, Object> processCharge(Map<String, Object> request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        Object amountObj = request.get("amount");
        String category = (String) request.get("category");
        String orderId = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", orderId);
        response.put("amount", amountObj);
        response.put("clientKey", "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eo");
        response.put("customerName", member.getName());
        response.put("orderName", category.equals("PERSONAL") ? "개인 지갑 충전" : "법인 지갑 충전");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> chargeSuccess(Map<String, Object> request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        Number amountNum = (Number) request.get("amount");
        Long amount = amountNum != null ? amountNum.longValue() : 0L;
        String category = (String) request.get("category");

        if ("PERSONAL".equals(category)) {
            Wallet wallet = walletRepository.findByMember(member)
                    .orElseThrow(() -> new IllegalArgumentException("개인 지갑이 존재하지 않습니다."));
            wallet.addBalance(amount);
            walletRepository.save(wallet);
        } else if ("BUSINESS".equals(category)) {
            Company company = member.getCompany();
            if (company == null) throw new IllegalArgumentException("소속된 기업 정보가 없습니다.");
            company.addBalance(amount);
            companyRepository.save(company);
        } else {
            throw new IllegalArgumentException("잘못된 충전 카테고리입니다.");
        }

        Transaction tx = Transaction.builder()
                .member(member)
                .amount(new BigDecimal(amount))
                .currency("KRW")
                .appliedRate(BigDecimal.ONE)
                .convertedAmount(new BigDecimal(amount))
                .status(TransactionStatus.SETTLED)
                .description("충전")
                .title(category.equals("PERSONAL") ? "개인 지갑 충전" : "기업 지갑 충전")
                .type("CHARGE")
                .category(category)
                .build();
        transactionRepository.save(tx);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("chargedAmount", amount);
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> activateCorporateMasterAccount() {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        Company company = member.getCompany();
        if (company == null) throw new IllegalArgumentException("소속된 기업 정보가 없습니다.");

        String newAccount = "EX-2003-" + (int)(Math.random() * 900000 + 100000);
        company.activateAccount(newAccount);

        Map<String, Object> result = new HashMap<>();
        result.put("accountNumber", newAccount);
        result.put("companyName", company.getCompanyName());
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> executeTransfer(Map<String, Object> request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        Number totalKrwNum = (Number) request.get("debitAmount"); // total required amount including fees
        if (totalKrwNum == null) totalKrwNum = (Number) request.get("amount"); // fallback
        Long totalKrw = totalKrwNum != null ? totalKrwNum.longValue() : 0L;
        String category = (String) request.get("category");

        if ("PERSONAL".equals(category)) {
            Wallet wallet = walletRepository.findByMember(member)
                    .orElseThrow(() -> new IllegalArgumentException("개인 지갑이 존재하지 않습니다."));
            wallet.deductBalance(totalKrw);
            walletRepository.save(wallet);
        } else if ("BUSINESS".equals(category)) {
            Company company = member.getCompany();
            if (company == null) throw new IllegalArgumentException("소속된 기업 정보가 없습니다.");
            company.deductBalance(totalKrw);
            companyRepository.save(company);
        } else {
            throw new IllegalArgumentException("잘못된 송금 카테고리입니다.");
        }

        String recipientName = (String) request.get("recipientName");
        String toAccount = (String) request.get("toAccount");
        Number amountNum = (Number) request.get("amount");
        Long pureAmount = amountNum != null ? amountNum.longValue() : 0L;

        // 1. Sender Transaction
        Transaction txSender = Transaction.builder()
                .member(member)
                .amount(new BigDecimal(totalKrw).negate())
                .currency("KRW")
                .appliedRate(BigDecimal.ONE)
                .convertedAmount(new BigDecimal(totalKrw).negate())
                .status(TransactionStatus.SETTLED)
                .description("송금")
                .title(recipientName != null ? recipientName + " 송금" : "송금")
                .type("TRANSFER")
                .category(category)
                .build();
        transactionRepository.save(txSender);

        // 2. Find Recipient and Add Balance
        if (toAccount != null && !toAccount.isEmpty()) {
            if (toAccount.startsWith("EX-2003-")) { // Corporate Recipient
                companyRepository.findByCorporateAccountNumber(toAccount).ifPresent(targetCompany -> {
                    targetCompany.addBalance(pureAmount);
                    companyRepository.save(targetCompany);
                    
                    // Not easy to get the specific member of a company to log a transaction here, 
                    // but assuming it's an admin or logging it without member, or finding a representative member.
                    // For now, let's find one member of the company to bind the transaction to, or modify Transaction to allow null member.
                    memberRepository.findByCompany(targetCompany).stream().findFirst().ifPresent(targetMember -> {
                        Transaction txReceiver = Transaction.builder()
                                .member(targetMember)
                                .amount(new BigDecimal(pureAmount))
                                .currency("KRW")
                                .appliedRate(BigDecimal.ONE)
                                .convertedAmount(new BigDecimal(pureAmount))
                                .status(TransactionStatus.SETTLED)
                                .description("입금")
                                .title((category.equals("BUSINESS") ? member.getCompany().getCompanyName() : member.getName()) + " 입금")
                                .type("INCOMING")
                                .category("BUSINESS")
                                .build();
                        transactionRepository.save(txReceiver);
                    });
                });
            } else if (toAccount.startsWith("EX-1004-")) { // Personal Recipient
                walletRepository.findByAccountNumber(toAccount).ifPresent(targetWallet -> {
                    targetWallet.addBalance(pureAmount);
                    walletRepository.save(targetWallet);

                    Transaction txReceiver = Transaction.builder()
                            .member(targetWallet.getMember())
                            .amount(new BigDecimal(pureAmount))
                            .currency("KRW")
                            .appliedRate(BigDecimal.ONE)
                            .convertedAmount(new BigDecimal(pureAmount))
                            .status(TransactionStatus.SETTLED)
                            .description("입금")
                            .title((category.equals("BUSINESS") ? member.getCompany().getCompanyName() : member.getName()) + " 입금")
                            .type("INCOMING")
                            .category("PERSONAL")
                            .build();
                    transactionRepository.save(txReceiver);
                });
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        return response;
    }

    @Override
    @Transactional
    public Map<String, Object> exchangeCurrency(Map<String, Object> request) {
        String email = SecurityUtil.getCurrentUserEmail();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found: " + email));

        String category = (String) request.get("category");
        String currency = (String) request.get("currency");
        String type = (String) request.get("type"); // "BUY" (KRW -> 外貨) or "SELL" (外貨 -> KRW)
        
        Number krwAmountNum = (Number) request.get("krwAmount");
        Number foreignAmountNum = (Number) request.get("foreignAmount");
        
        Long krwAmount = krwAmountNum != null ? krwAmountNum.longValue() : 0L;
        BigDecimal foreignAmount = foreignAmountNum != null ? new BigDecimal(foreignAmountNum.toString()) : BigDecimal.ZERO;

        if ("PERSONAL".equals(category)) {
            Wallet wallet = walletRepository.findByMember(member)
                    .orElseThrow(() -> new IllegalArgumentException("개인 지갑이 존재하지 않습니다."));
            if ("BUY".equals(type)) {
                wallet.deductBalance(krwAmount);
                wallet.addForeignBalance(currency, foreignAmount);
            } else if ("SELL".equals(type)) {
                wallet.deductForeignBalance(currency, foreignAmount);
                wallet.addBalance(krwAmount);
            }
            walletRepository.save(wallet);
        } else if ("BUSINESS".equals(category)) {
            Company company = member.getCompany();
            if (company == null) throw new IllegalArgumentException("소속된 기업 정보가 없습니다.");
            if ("BUY".equals(type)) {
                company.deductBalance(krwAmount);
                company.addForeignBalance(currency, foreignAmount);
            } else if ("SELL".equals(type)) {
                company.deductForeignBalance(currency, foreignAmount);
                company.addBalance(krwAmount);
            }
            companyRepository.save(company);
        } else {
            throw new IllegalArgumentException("잘못된 카테고리입니다.");
        }

        Transaction tx = Transaction.builder()
                .member(member)
                .amount("BUY".equals(type) ? new BigDecimal(krwAmount).negate() : new BigDecimal(krwAmount))
                .currency(currency)
                .appliedRate(krwAmountNum != null && foreignAmount.compareTo(BigDecimal.ZERO) > 0 ? new BigDecimal(krwAmount).divide(foreignAmount, java.math.RoundingMode.HALF_UP) : BigDecimal.ONE)
                .convertedAmount(new BigDecimal(krwAmount))
                .status(TransactionStatus.EXCHANGE_COMPLETED)
                .description(currency + ("BUY".equals(type) ? " 환전 (매수)" : " 환전 (매도)"))
                .title(currency + ("BUY".equals(type) ? " 환전 (매수)" : " 환전 (매도)"))
                .type("EXCHANGE")
                .category(category)
                .build();
        transactionRepository.save(tx);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        return response;
    }
}