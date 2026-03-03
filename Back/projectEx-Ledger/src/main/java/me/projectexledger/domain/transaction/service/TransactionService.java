package me.projectexledger.domain.transaction.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.exchange.dto.ExchangeRateDTO;
import me.projectexledger.domain.exchange.service.ExchangeRateService;
import me.projectexledger.domain.transaction.entity.Transaction; // 🌟 임포트 주의!
import me.projectexledger.domain.transaction.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final ExchangeRateService exchangeRateService;

    @Transactional
    public Transaction createTransaction(String userId, BigDecimal amount, String currency, String desc) {
        // 1. 환율 가져오기 (A 담당자 협업)
        List<ExchangeRateDTO> latestRates = exchangeRateService.getLatestRatesFromCacheOrDb();
        BigDecimal rate = latestRates.stream()
                .filter(r -> r.getCurUnit().equals(currency))
                .map(ExchangeRateDTO::getRate)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 통화: " + currency));

        // 2. 거래 생성 및 정산 계산 (C 담당 로직)
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .amount(amount)
                .currency(currency)
                .description(desc)
                .build();

        transaction.updateSettlement(rate);

        return transactionRepository.save(transaction);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getMyTransactions(String userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}