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
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementEngineService {


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

        // 🌟 [요청사항] 4줄짜리 필터링 리스트 고정
        List<String> excludedNames = Arrays.asList(
                "Member C",
                "홍길동",
                "sQYmV8wFZCmWTOSwuV2PmA==",
                "sQYmV8wfZCmWTOSwuV2PmA:"
        );

        BigDecimal totalAmount = settlementRepository.sumTotalSettlementAmountByStatusAndClientNameNotInAndCreatedAtAfter(
                SettlementStatus.COMPLETED, excludedNames, targetDate);

        return DashboardSummaryDTO.builder()
                .totalPaymentAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO)
                .totalRemittanceCount(settlementRepository.countByClientNameNotInAndCreatedAtAfter(excludedNames, targetDate))
                .completedRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.COMPLETED, excludedNames, targetDate))
                .pendingRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.PENDING, excludedNames, targetDate))
                .failedRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.FAILED, excludedNames, targetDate))
                .waitingRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.WAITING, excludedNames, targetDate))
                .failedRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.FAILED, excludedNames, targetDate))
                .rejectedRemittanceCount(settlementRepository.countByStatusAndClientNameNotInAndCreatedAtAfter(SettlementStatus.REJECTED, excludedNames, targetDate)) // 🌟 [추가]
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

            boolean isExcludedClient = "Member C".equals(clientName) || "홍길동".equals(clientName);
            if (isExcludedClient) return;

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

            // 🌟 [요청사항] 오리지널 환율 API 로직 유지 (서버 꺼지면 API 이슈 확인 필요)
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

        // 🌟 [요청사항] 대시보드와 똑같은 4줄 필터 리스트 적용
        List<String> excludedNames = Arrays.asList(
                "Member C",
                "홍길동",
                "sQYmV8wFZCmWTOSwuV2PmA==",
                "TqL4CtvtXX5jTHseBTWPmA==",
                "이사장"
        );
        Page<Settlement> settlements = settlementRepository.findAllByClientNameNotIn(excludedNames, pageable);

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
    public void createRandomTestSettlements(int count) {
        String[] clientList = {"(주)무신사", "우아한형제들", "당근마켓", "쿠팡페이", "오늘의집", "(주)로켓상사", "네이버페이", "야놀자", "토스", "직방"};
        SettlementStatus[] statuses = {SettlementStatus.COMPLETED, SettlementStatus.FAILED, SettlementStatus.REJECTED};
        String[] bankList = {"국민은행", "신한은행", "우리은행", "하나은행", "카카오뱅크", "기업은행", "농협은행"};

        java.util.Random random = new java.util.Random();

        for (int i = 0; i < count; i++) {
            String randomClient = clientList[random.nextInt(clientList.length)];
            SettlementStatus randomStatus = statuses[random.nextInt(statuses.length)];
            String randomBank = bankList[random.nextInt(bankList.length)];

            // 100만 ~ 2억 사이의 랜덤 금액 생성
            long[] cleanAmounts = {10000000L, 20000000L, 50000000L, 80000000L, 120000000L, 200000000L};
            BigDecimal amount = new BigDecimal(cleanAmounts[random.nextInt(cleanAmounts.length)]);
            BigDecimal settlementAmount = amount.multiply(new BigDecimal("0.98")).setScale(0, RoundingMode.DOWN);

            settlementRepository.save(Settlement.builder()
                    .orderId("T-ORDER-" + System.currentTimeMillis() + "-" + i)
                    .transactionId("TX-" + System.nanoTime())
                    .clientName(randomClient)
                    .bankName(randomBank)
                    .accountNumber((random.nextInt(900) + 100) + "-" + (random.nextInt(900000) + 100000) + "-12")
                    .amount(amount)
                    .currency("KRW")
                    .settlementAmount(settlementAmount)
                    .status(randomStatus)
                    .resolutionReason(randomStatus == SettlementStatus.REJECTED ? "계좌 정보 불일치로 인한 관리자 반려" : null)
                    .build());
        }
    }
    @Transactional
    public void rejectSettlement(Long settlementId, String reason) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("해당 정산 건을 찾을 수 없습니다."));

        // 엔티티의 비즈니스 로직 호출 (상태 변경 + 사유 저장)
        settlement.markAsRejected(reason);

        log.info("[Settlement] 정산 반려 완료 - ID: {}, 사유: {}", settlementId, reason);
    }
    @Transactional
    public void approveSettlement(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new IllegalArgumentException("해당 정산 건을 찾을 수 없습니다."));

        if (settlement.getStatus() != SettlementStatus.WAITING && settlement.getStatus() != SettlementStatus.PENDING) {
            throw new IllegalStateException("승인 가능한 상태가 아닙니다.");
        }

        // 🌟 [정정 반영] 승인 버튼 누르면 바로 결제 대사 리스트에서 "정산 완료"가 되도록 상태를 COMPLETED로 변경!
        settlement.updateStatus(SettlementStatus.COMPLETED);
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

        BigDecimal amountInKrw = s.getAmount();
        if (!"KRW".equalsIgnoreCase(s.getCurrency())) {
            amountInKrw = s.getAmount().multiply(s.getBaseRate());
        }

        BigDecimal platformFee = amountInKrw
                .multiply(policy.getPlatformFeeRate())
                .setScale(0, RoundingMode.DOWN);

        BigDecimal vat = platformFee.multiply(new BigDecimal("0.10"))
                .setScale(0, RoundingMode.DOWN);

        return SettlementDetailDTO.builder()
                .id(s.getOrderId())
                .createdAt(s.getUpdatedAt() != null ?
                        s.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "-")
                .amountUsd(s.getAmount())
                .currency(s.getCurrency())
                .exchangeRate(s.getFinalAppliedRate())
                .feeBreakdown(SettlementDetailDTO.FeeBreakdown.builder()
                        .platform(platformFee)
                        .network(policy.getNetworkFee())
                        .vat(vat)
                        .build())
                .finalAmountKrw(s.getSettlementAmount())
                .status(s.getStatus().name())
                .resolutionReason(s.getResolutionReason())
                .build();
    }

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