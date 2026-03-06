package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.payment.repository.PaymentLogRepository;
import me.projectexledger.domain.settlement.api.PortOneClient;
import me.projectexledger.portone.Response.PortOnePaymentResponse;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.entity.RemittanceHistory;
import me.projectexledger.domain.settlement.repository.RemittanceHistoryRepository;
import me.projectexledger.domain.settlement.entity.Settlement;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.domain.settlement.util.ExchangeRateCalculator;
import me.projectexledger.domain.exchange.service.CurrencyCalculator;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.client.entity.ClientGrade;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementEngineService {

    private final PaymentLogRepository paymentLogRepository;
    private final SettlementRepository settlementRepository;
    private final ExchangeRateCalculator exchangeRateCalculator;
    private final PortOneClient portOneClient;
    private final RemittanceHistoryRepository remittanceHistoryRepository;
    private final CurrencyCalculator currencyCalculator;
    private final ClientRepository clientRepository;

    // 🌟 [아이디어 반영] 월일(0306) + 무작위 숫자 8자리의 세련된 ID 생성기
    private String generateProMerchantId() {
        // 1. 현재 날짜를 MMdd 형식으로 추출 (예: 오늘이 3월 6일이면 0306)
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("MMdd"));

        // 2. 정확히 8자리의 무작위 숫자 생성 (00000000 ~ 99999999)
        // 1억 미만의 숫자를 생성한 뒤 부족한 자릿수는 0으로 채웁니다.
        String randomPart = String.format("%08d", (int)(Math.random() * 100000000));

        return  datePart + randomPart;
    }

    public DashboardSummaryDTO getDashboardSummary() {
        BigDecimal totalAmount = settlementRepository.sumTotalSettlementAmountByStatus(SettlementStatus.COMPLETED);
        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalRemittanceCount(settlementRepository.count())
                .completedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.COMPLETED))
                .pendingRemittanceCount(settlementRepository.countByStatus(SettlementStatus.PENDING))
                .failedRemittanceCount(settlementRepository.countByStatus(SettlementStatus.FAILED))
                .discrepancyCount(settlementRepository.countByStatus(SettlementStatus.DISCREPANCY))
                .waitingRemittanceCount(settlementRepository.countByStatus(SettlementStatus.WAITING))
                .build();
    }

    @Transactional
    public void processDailySettlement(String targetDate) {
        log.info("[Settlement] {} 일자 포트원 정산 데이터 동기화 시작", targetDate);
        PortOnePaymentResponse response = portOneClient.getPayments(targetDate, targetDate, 0, 100);

        BigDecimal networkFee = new BigDecimal("2000");
        BigDecimal spread = new BigDecimal("20.0");
        String[] bankList = {"국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크", "기업은행", "농협은행"};

        response.getItems().forEach(item -> {
            String clientName = (item.getCustomer() != null && item.getCustomer().getName() != null)
                    ? item.getCustomer().getName() : "익명 기업";

            if (!"PAID".equals(item.getStatus())) return;

            boolean isTestPayment2 = item.getAmount().getTotal().intValue() == 1000 && "Member C".equals(clientName);
            if (isTestPayment2) return;

            if (settlementRepository.existsByOrderId(item.getId())) return;

            Client client = clientRepository.findByName(clientName).orElseGet(() -> {
                String randomBank = bankList[(int)(Math.random() * bankList.length)];
                String randomAccount = (int)(Math.random() * 900 + 100) + "-" + (int)(Math.random() * 900000 + 100000) + "-" + (int)(Math.random() * 90 + 10);

                log.info("[Auto-Reg] 신규 가맹점 등록: {}", clientName);
                return clientRepository.save(Client.builder()
                        .name(clientName)
                        .merchantId(generateProMerchantId()) // 🌟 [수정] 0306-XXXXXXXX 형식 주입
                        .businessNumber("123-45-" + (int)(Math.random() * 90000 + 10000))
                        .status(ClientStatus.APPROVED)
                        .grade(ClientGrade.GENERAL)
                        .feeRate(new BigDecimal("0.015"))
                        .bankName(randomBank)
                        .accountNumber(randomAccount)
                        .preferenceRate(new BigDecimal("0.90"))
                        .build());
            });

            BigDecimal platformFeeRate = client.getFeeRate();
            BigDecimal preferenceRate = client.getPreferenceRate() != null ? client.getPreferenceRate() : new BigDecimal("0.90");
            String targetBank = client.getBankName();
            String targetAccount = client.getAccountNumber();

            BigDecimal totalAmount = item.getAmount().getTotal();
            String currency = item.getCurrency() != null ? item.getCurrency().toUpperCase() : "USD";
            BigDecimal tempRate = exchangeRateCalculator.getExchangeRate(currency);
            if (tempRate == null) tempRate = new BigDecimal("1400.00");
            BigDecimal finalLiveRate = normalizeRate(tempRate, currency);

            BigDecimal settlementAmount = totalAmount;
            BigDecimal finalAppliedRate = finalLiveRate;

            if ("KRW".equalsIgnoreCase(currency)) {
                BigDecimal fee = totalAmount.multiply(platformFeeRate);
                settlementAmount = totalAmount.subtract(fee).subtract(networkFee)
                        .setScale(0, RoundingMode.DOWN);
            } else {
                settlementAmount = currencyCalculator.calculateFinalSettlementAmount(
                        totalAmount, finalLiveRate, currency, platformFeeRate, networkFee, spread, preferenceRate
                );
                finalAppliedRate = currencyCalculator.calculateFinalRate(finalLiveRate, spread, preferenceRate);
            }

            if (settlementAmount.compareTo(BigDecimal.ZERO) < 0) settlementAmount = BigDecimal.ZERO;

            settlementRepository.save(Settlement.builder()
                    .orderId(item.getId())
                    .transactionId(item.getId())
                    .clientName(clientName)
                    .bankName(targetBank)
                    .accountNumber(targetAccount)
                    .amount(totalAmount)
                    .currency(currency)
                    .settlementAmount(settlementAmount)
                    .baseRate(finalLiveRate)
                    .finalAppliedRate(finalAppliedRate)
                    .preferredRate(preferenceRate)
                    .spreadFee(spread)
                    .status(SettlementStatus.PENDING)
                    .build());
        });
        log.info("[Settlement] 정산 데이터 동기화 완료");
    }

    public List<ReconciliationListDTO> getReconciliationList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Settlement> settlements = settlementRepository.findAll(pageable);

        return settlements.stream().map(s -> ReconciliationListDTO.builder()
                .id(s.getId())
                .orderId(s.getOrderId())
                .clientName(s.getClientName())
                .bankName(s.getBankName())
                .accountNumber(s.getAccountNumber())
                .amount(s.getAmount())
                .originalAmount(s.getAmount())
                .settlementAmount(s.getSettlementAmount())
                .status(s.getStatus().name())
                .updatedAt(s.getUpdatedAt() != null ?
                        s.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "")
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public void resolveDiscrepancy(Long settlementId, BigDecimal correctedAmount, String reason) {
        Settlement settlement = settlementRepository.findById(settlementId).orElseThrow();
        settlement.updateSettlementAmount(correctedAmount);
        settlement.markAsResolved(reason);
    }

    @Transactional
    public void retryRemittance(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId).orElseThrow();
        try {
            settlement.updateStatus(SettlementStatus.COMPLETED);
            remittanceHistoryRepository.save(RemittanceHistory.builder().settlement(settlement).status("SUCCESS").attemptCount(2).build());
        } catch (Exception e) {
            settlement.updateStatus(SettlementStatus.FAILED);
            remittanceHistoryRepository.save(RemittanceHistory.builder().settlement(settlement).status("FAILED").errorMessage(e.getMessage()).attemptCount(2).build());
        }
    }

    @Transactional
    public void createTestSettlement(String orderId, String clientName, BigDecimal amount, String currency, SettlementStatus status) {
        String[] clientList = {"(주)무신사", "우아한형제들", "당근마켓", "쿠팡페이", "오늘의집", "(주)로켓상사", "네이버페이", "야놀자"};
        String finalClientName = clientList[(int)(Math.random() * clientList.length)];

        String[] bankList = {"국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크", "기업은행", "농협은행"};

        Client client = clientRepository.findByName(finalClientName).orElseGet(() -> {
            String randomBank = bankList[(int)(Math.random() * bankList.length)];
            String randomAccount = (int)(Math.random() * 900 + 100) + "-" + (int)(Math.random() * 900000 + 100000) + "-" + (int)(Math.random() * 90 + 10);

            return clientRepository.save(Client.builder()
                    .merchantId(generateProMerchantId()) // 🌟 [수정] 테스트 주입 시에도 동일 포맷 적용
                    .name(finalClientName)
                    .businessNumber("000-00-" + (int)(Math.random() * 90000 + 10000))
                    .status(ClientStatus.APPROVED)
                    .grade(ClientGrade.GENERAL)
                    .feeRate(new BigDecimal("0.015"))
                    .bankName(randomBank)
                    .accountNumber(randomAccount)
                    .preferenceRate(new BigDecimal("0.90"))
                    .build());
        });

        int randomMoney = ((int)(Math.random() * 30000) + 100) * 100;
        BigDecimal originalAmount = new BigDecimal(randomMoney);

        BigDecimal realUsdRate = exchangeRateCalculator.getExchangeRate("USD");
        if (realUsdRate == null) realUsdRate = new BigDecimal("1400.00");

        BigDecimal feeRate = client.getFeeRate() != null ? client.getFeeRate() : new BigDecimal("0.015");
        BigDecimal finalSettlementAmount = originalAmount.subtract(originalAmount.multiply(feeRate)).subtract(new BigDecimal("2000"))
                .setScale(0, RoundingMode.DOWN);

        settlementRepository.save(Settlement.builder()
                .orderId(orderId)
                .transactionId("TX-" + System.currentTimeMillis())
                .clientName(client.getName())
                .bankName(client.getBankName())
                .accountNumber(client.getAccountNumber())
                .amount(originalAmount)
                .currency(currency)
                .settlementAmount(finalSettlementAmount)
                .baseRate(realUsdRate)
                .finalAppliedRate(realUsdRate.subtract(new BigDecimal("10.00")))
                .preferredRate(client.getPreferenceRate() != null ? client.getPreferenceRate() : new BigDecimal("0.90"))
                .spreadFee(new BigDecimal("10.00"))
                .status(status)
                .build());
    }

    @Transactional
    public void approveSettlement(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("해당 정산 건을 찾을 수 없습니다. ID: " + settlementId));
        if (settlement.getStatus() != SettlementStatus.WAITING) {
            throw new IllegalStateException("승인 대기(WAITING) 상태의 건만 승인할 수 있습니다.");
        }
        settlement.updateStatus(SettlementStatus.WAITING_USER_CONSENT);
    }

    public List<ReconciliationListDTO> getMySettlementHistory(String clientName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Settlement> settlements = settlementRepository.findByClientName(clientName, pageable);
        return settlements.stream().map(s -> ReconciliationListDTO.builder()
                .id(s.getId())
                .orderId(s.getOrderId())
                .clientName(s.getClientName())
                .settlementAmount(s.getSettlementAmount())
                .status(s.getStatus().name())
                .updatedAt(s.getUpdatedAt().toString())
                .build()).collect(Collectors.toList());
    }

    private BigDecimal normalizeRate(BigDecimal rate, String currency) {
        if (rate == null) return BigDecimal.ZERO;
        if (List.of("JPY", "VND", "IDR").contains(currency.toUpperCase())) {
            return rate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        }
        return rate;
    }
}