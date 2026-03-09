package me.projectexledger.domain.transaction.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.common.util.ReconciliationUtil;
import me.projectexledger.domain.exchange.service.ExchangeRateService;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import me.projectexledger.domain.transaction.dto.MyDashboardResponse;
import me.projectexledger.domain.transaction.entity.Transaction;
import me.projectexledger.domain.transaction.entity.TransactionStatus;
import me.projectexledger.domain.transaction.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final MemberRepository memberRepository;
    private final ExchangeRateService exchangeRateService;
    private final ReconciliationUtil reconciliationUtil; // 🌟 A님의 유틸리티 주입

    @Transactional
    public Transaction createTransaction(String email, BigDecimal amount, String currency, String desc, String externalId) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        BigDecimal rate = exchangeRateService.getLatestRate(currency);

        Transaction transaction = Transaction.builder()
                .member(member)
                .amount(amount)
                .currency(currency)
                .description(desc)
                .externalTransactionId(externalId) // 🌟 외부 ID 매핑
                .status(TransactionStatus.PENDING)
                .build();

        transaction.calculateSettlement(rate);

        log.info("💰 거래 생성 완료: 사용자={}, 외화={} {}, 원화={} KRW",
                email, amount, currency, transaction.getConvertedAmount());

        return transactionRepository.save(transaction);
    }

    @Transactional
    public void verifyAndConfirmSettlement(Long transactionId, Map<String, BigDecimal> portOneData) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("거래 내역을 찾을 수 없습니다."));

        BigDecimal externalAmount = portOneData.get(tx.getExternalTransactionId());

        if (externalAmount == null) {
            log.error("❌ 대조 실패: 외부 데이터에 TX_ID {} 가 없습니다.", tx.getExternalTransactionId());
            tx.markAsDiscrepancy();
        } else if (tx.getAmount().compareTo(externalAmount) != 0) {
            log.error("❌ 금액 불일치: 내부 {}, 외부 {}", tx.getAmount(), externalAmount);
            tx.markAsDiscrepancy();
        } else {
            log.info("✅ 대조 일치: TX_ID {}", tx.getExternalTransactionId());
            tx.markAsSettled();
        }
    }

    @Transactional(readOnly = true)
    public List<Transaction> getMyTransactions(String email) {
        return transactionRepository.findByMemberEmailOrderByCreatedAtDesc(email);
    }

    @Transactional(readOnly = true)
    public MyDashboardResponse getMyDashboardSummary(String email) {
        List<Transaction> transactions = transactionRepository.findByMemberEmailOrderByCreatedAtDesc(email);

        BigDecimal totalSpent = transactions.stream()
                .filter(t -> t.getStatus() != TransactionStatus.FAILED)
                .map(t -> t.getConvertedAmount() != null ? t.getConvertedAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pending = transactions.stream()
                .filter(t -> t.getStatus() == TransactionStatus.PENDING || t.getStatus() == TransactionStatus.EXCHANGE_COMPLETED)
                .count();

        long settled = transactions.stream()
                .filter(t -> t.getStatus() == TransactionStatus.SETTLED)
                .count();

        List<MyDashboardResponse.DailySpending> chartData = transactions.stream()
                .filter(t -> t.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getCreatedAt().toLocalDate().toString(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getConvertedAmount, BigDecimal::add)
                ))
                .entrySet().stream()
                .map(entry -> MyDashboardResponse.DailySpending.builder()
                        .date(entry.getKey())
                        .amount(entry.getValue())
                        .build())
                .sorted(Comparator.comparing(MyDashboardResponse.DailySpending::getDate))
                .collect(Collectors.toList());

        return MyDashboardResponse.builder()
                .totalSpentKrw(totalSpent)
                .pendingCount(pending)
                .settledCount(settled)
                .chartData(chartData)
                .build();
    }
}