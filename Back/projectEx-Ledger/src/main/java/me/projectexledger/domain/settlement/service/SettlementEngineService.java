package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.admin.dto.DashboardSummaryDTO;
import me.projectexledger.domain.payment.repository.PaymentLogRepository;
import me.projectexledger.domain.settlement.api.PortOneClient;
import me.projectexledger.domain.settlement.dto.SettlementDetailDTO;
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.portone.Response.PortOnePaymentResponse;
import me.projectexledger.domain.settlement.dto.ReconciliationListDTO;
import me.projectexledger.domain.settlement.entity.RemittanceHistory;
import me.projectexledger.domain.settlement.repository.RemittanceHistoryRepository;
import me.projectexledger.domain.settlement.entity.Settlement;
import me.projectexledger.domain.settlement.entity.SettlementStatus;
import me.projectexledger.domain.settlement.util.ExchangeRateCalculator;
import me.projectexledger.domain.exchange.service.CurrencyCalculator;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.client.entity.ClientGrade;

import me.projectexledger.domain.company.entity.SettlementPolicy;
import me.projectexledger.domain.company.service.SettlementPolicyService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final SettlementPolicyService settlementPolicyService;

    private String generateProMerchantId() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("MMdd"));
        String randomPart = String.format("%08d", (int)(Math.random() * 100000000));
        return  datePart + randomPart;
    }

    public DashboardSummaryDTO getDashboardSummary() {
        return getDashboardSummary(3);
    }

    public DashboardSummaryDTO getDashboardSummary(Integer months) {
        LocalDateTime targetDate = LocalDateTime.now().minusMonths(months != null ? months : 3);

        BigDecimal totalAmount = settlementRepository.sumTotalSettlementAmountByStatusAndCreatedAtAfter(SettlementStatus.COMPLETED, targetDate);

        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalRemittanceCount(settlementRepository.countByCreatedAtAfter(targetDate))
                .completedRemittanceCount(settlementRepository.countByStatusAndCreatedAtAfter(SettlementStatus.COMPLETED, targetDate))
                .pendingRemittanceCount(settlementRepository.countByStatusAndCreatedAtAfter(SettlementStatus.PENDING, targetDate))
                .failedRemittanceCount(settlementRepository.countByStatusAndCreatedAtAfter(SettlementStatus.FAILED, targetDate))
                .discrepancyCount(settlementRepository.countByStatusAndCreatedAtAfter(SettlementStatus.DISCREPANCY, targetDate))
                .waitingRemittanceCount(settlementRepository.countByStatusAndCreatedAtAfter(SettlementStatus.WAITING, targetDate))
                .build();
    }

    @Transactional
    public void processDailySettlement(String targetDate) {
        log.info("[Settlement] {} 일자 포트원 정산 데이터 동기화 시작", targetDate);
        PortOnePaymentResponse response = portOneClient.getPayments(targetDate, targetDate, 0, 100);

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
                        .merchantId(generateProMerchantId())
                        .businessNumber("123-45-" + (int)(Math.random() * 90000 + 10000))
                        .status(ClientStatus.APPROVED)
                        .grade(ClientGrade.GENERAL)
                        .bankName(randomBank)
                        .accountNumber(randomAccount)
                        .build());
            });

            SettlementPolicy policy = settlementPolicyService.getEffectivePolicy(client.getMerchantId(), client.getGrade());

            BigDecimal platformFeeRate = policy.getPlatformFeeRate();
            BigDecimal preferenceRate = policy.getPreferenceRate();
            BigDecimal networkFee = policy.getNetworkFee();
            BigDecimal spread = policy.getExchangeSpread();

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

    public Page<ReconciliationListDTO> getReconciliationList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Settlement> settlements = settlementRepository.findAll(pageable);

        return settlements.map(s -> {
            Client client = clientRepository.findByName(s.getClientName()).orElse(null);
            String gradeStr = (client != null && client.getGrade() != null) ? client.getGrade().name() : "GENERAL";

            return ReconciliationListDTO.builder()
                    .id(s.getId())
                    .orderId(s.getOrderId())
                    .clientName(s.getClientName())
                    .merchantId(s.getMerchantId())
                    .bankName(s.getBankName())
                    .accountNumber(s.getAccountNumber())
                    .amount(s.getAmount())
                    .originalAmount(s.getAmount())
                    .settlementAmount(s.getSettlementAmount())
                    .status(s.getStatus().name())
                    .grade(gradeStr)
                    .updatedAt(s.getUpdatedAt() != null ?
                            s.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "")
                    .build();
        });
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
    public void createTestSettlement(String orderId, String clientName, BigDecimal amount, String currency, SettlementStatus status, ClientGrade grade) {
        for (int i = 0; i < 10; i++) {
            final int loopIndex = i;

            String uniqueOrderId = (orderId != null ? orderId : "T-ORDER") + "-TEST-" + loopIndex + "-" + System.nanoTime();

            String[] clientList = {"(주)무신사", "우아한형제들", "당근마켓", "쿠팡페이", "오늘의집", "(주)로켓상사", "네이버페이", "야놀자", "토스", "직방"};
            String finalClientName = clientList[(int)(Math.random() * clientList.length)];

            ClientGrade mixedGrade = (loopIndex % 2 == 0) ? ClientGrade.PARTNER : ClientGrade.GENERAL;

            String[] bankList = {"국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크", "기업은행", "농협은행"};

            Client client = clientRepository.findByName(finalClientName).orElseGet(() -> {
                String randomBank = bankList[(int)(Math.random() * bankList.length)];
                String randomAccount = (int)(Math.random() * 900 + 100) + "-" + (int)(Math.random() * 900000 + 100000) + "-" + (int)(Math.random() * 90 + 10);

                return clientRepository.save(Client.builder()
                        .merchantId(generateProMerchantId())
                        .name(finalClientName)
                        .businessNumber("000-00-" + (int)(Math.random() * 90000 + (loopIndex * 100)))
                        .status(ClientStatus.APPROVED)
                        .grade(mixedGrade)
                        .bankName(randomBank)
                        .accountNumber(randomAccount)
                        .build());
            });

            client.setGrade(mixedGrade);

            // 🌟 [핵심 수정] 파라미터(amount)로 넘어온 값을 완전히 무시하고 무조건 배열에서 뽑아 쓰도록 강제합니다!
            long[] cleanAmounts = {10000000L, 20000000L, 30000000L, 50000000L, 80000000L, 100000000L, 150000000L, 200000000L};
            long randomCleanAmount = cleanAmounts[(int)(Math.random() * cleanAmounts.length)];

            // 아예 amount 변수를 보지 않고 바로 randomCleanAmount를 사용합니다.
            BigDecimal originalAmount = new BigDecimal(randomCleanAmount);

            BigDecimal realUsdRate = exchangeRateCalculator.getExchangeRate("USD");
            if (realUsdRate == null) realUsdRate = new BigDecimal("1400.00");

            SettlementPolicy policy = settlementPolicyService.getEffectivePolicy(client.getMerchantId(), client.getGrade());

            BigDecimal feeRate = policy.getPlatformFeeRate();
            BigDecimal networkFee = policy.getNetworkFee();
            BigDecimal spread = policy.getExchangeSpread();
            BigDecimal prefRate = policy.getPreferenceRate();

            // 수수료를 뗀 최종 송금액 계산
            BigDecimal finalSettlementAmount = originalAmount.subtract(originalAmount.multiply(feeRate)).subtract(networkFee)
                    .setScale(0, RoundingMode.DOWN);

            settlementRepository.save(Settlement.builder()
                    .orderId(uniqueOrderId)
                    .transactionId("TX-" + System.nanoTime() + "-" + loopIndex)
                    .clientName(client.getName())
                    .bankName(client.getBankName())
                    .accountNumber(client.getAccountNumber())
                    .amount(originalAmount) // 🌟 무조건 예쁜 숫자(예: 10,000,000, 80,000,000 등)가 들어갑니다.
                    .currency(currency != null ? currency : "KRW")
                    .settlementAmount(finalSettlementAmount)
                    .baseRate(realUsdRate)
                    .finalAppliedRate(realUsdRate.subtract(spread))
                    .preferredRate(prefRate)
                    .spreadFee(spread)
                    .status(status)
                    .build());
        }
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

    public SettlementDetailDTO getSettlementDetail(Long id) {
        Settlement s = settlementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 정산 건을 찾을 수 없습니다. ID: " + id));

        Client client = clientRepository.findByName(s.getClientName()).orElse(null);
        ClientGrade grade = (client != null) ? client.getGrade() : ClientGrade.GENERAL;
        SettlementPolicy policy = settlementPolicyService.getEffectivePolicy(s.getMerchantId(), grade);

        // 🌟 [수정] 통화가 KRW가 아닐 때만 환율을 곱해서 수수료 기준가를 잡습니다.
        BigDecimal amountInKrw = s.getAmount();
        if (!"KRW".equalsIgnoreCase(s.getCurrency())) {
            amountInKrw = s.getAmount().multiply(s.getBaseRate());
        }

        // 수수료 계산 (기준가 * 수수료율)
        BigDecimal platformFee = amountInKrw
                .multiply(policy.getPlatformFeeRate())
                .setScale(0, RoundingMode.DOWN);

        BigDecimal vat = platformFee.multiply(new BigDecimal("0.10"))
                .setScale(0, RoundingMode.DOWN);

        return SettlementDetailDTO.builder()
                .id(s.getOrderId())
                .createdAt(s.getUpdatedAt() != null ?
                        s.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "-")
                .amountUsd(s.getAmount()) // 필드명은 유지하되 실제 원천 금액 전달
                .currency(s.getCurrency()) // 🌟 [추가] 실제 통화 정보 전달 (DTO에 필드 추가 필요)
                .exchangeRate(s.getFinalAppliedRate())
                .feeBreakdown(SettlementDetailDTO.FeeBreakdown.builder()
                        .platform(platformFee)
                        .network(policy.getNetworkFee())
                        .vat(vat)
                        .build())
                .finalAmountKrw(s.getSettlementAmount())
                .status(s.getStatus().name())
                .build();
    }

    // =========================================================================
    // 🌟 3개월 지난 데이터를 매일 자동 삭제하는 데이터 보관 정책 스케줄러
    // =========================================================================
    @Transactional
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupOldSettlementData() {
        LocalDateTime threeMonthsAgo = LocalDateTime.now().minusMonths(3);
        log.info("[Retention Policy] 3개월이 지난 오래된 정산 데이터를 삭제합니다. 기준일: {}", threeMonthsAgo);

        try {
            settlementRepository.deleteOldSettlementsBefore(threeMonthsAgo);
            log.info("[Retention Policy] 오래된 정산 데이터 삭제가 완료되었습니다.");
        } catch (Exception e) {
            log.error("[Retention Policy] 데이터 삭제 중 오류 발생: {}", e.getMessage());
        }
    }
}