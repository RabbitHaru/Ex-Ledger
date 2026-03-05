package me.projectexledger.domain.remittance.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.remittance.dto.FeeDTO;
import me.projectexledger.domain.remittance.dto.RemittanceDTO;
import me.projectexledger.domain.remittance.entity.Remittance;
import me.projectexledger.domain.remittance.entity.RemittanceStatus;
import me.projectexledger.domain.remittance.repository.RemittanceRepository;

// 🌟 1. 이 두 가지가 반드시 import 되어야 합니다!
import me.projectexledger.domain.exchange.service.CurrencyCalculator;
import me.projectexledger.domain.config.service.SystemConfigService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RemittanceService {

    private final RemittanceRepository remittanceRepository;
    private final CurrencyCalculator currencyCalculator;

    // 🌟 2. DB 설정값을 가져오는 서비스가 주입되어야 합니다!
    private final SystemConfigService configService;

    @Transactional
    public RemittanceDTO.Response processRemittanceRequest(String requesterId, RemittanceDTO.Request requestDTO) {

        Remittance remittance = Remittance.builder()
                .requesterId(requesterId)
                .receiverName(requestDTO.getRecipientName())
                .receiverBank(requestDTO.getRecipientBank())
                .receiverAccount(requestDTO.getRecipientAccount())
                .currency(requestDTO.getCurrency())
                .foreignCurrencyAmount(requestDTO.getAmount())
                .exchangeRate(requestDTO.getExchangeRate())
                .remittanceFee(requestDTO.getFeeAmount())
                .krwAmount(requestDTO.getTotalPayment())
                .status(RemittanceStatus.REQUESTED)
                .build();

        remittanceRepository.save(remittance);

        String transactionId = "TRX_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "_" + UUID.randomUUID().toString().substring(0, 8);

        return RemittanceDTO.Response.builder()
                .transactionId(transactionId)
                .status(remittance.getStatus().name())
                .requestedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
    }

    // 💸 🌟 3. 숫자가 아니라 DB(configService)에서 값을 꺼내오도록 바뀐 로직!
    public FeeDTO.Response calculateRemittanceFee(BigDecimal foreignAmount, BigDecimal baseRate, String clientGrade) {

        // 공통 스프레드 마진
        BigDecimal spread = configService.getBigDecimalConfig("BANK_SPREAD_RATE", "20.0");

        BigDecimal preferenceRate;
        BigDecimal telegraphicFee;
        BigDecimal processingFeeRate;

        // 등급별 정책 DB 연동
        if ("VIP".equalsIgnoreCase(clientGrade) || (clientGrade != null && clientGrade.contains("기업"))) {
            preferenceRate = configService.getBigDecimalConfig("REMITTANCE_VIP_PREF_RATE", "1.00");
            telegraphicFee = BigDecimal.ZERO;
            processingFeeRate = configService.getBigDecimalConfig("REMITTANCE_VIP_FEE_RATE", "0.003");
        } else {
            preferenceRate = configService.getBigDecimalConfig("REMITTANCE_NORMAL_PREF_RATE", "0.90");
            telegraphicFee = configService.getBigDecimalConfig("REMITTANCE_NORMAL_TELEGRAPHIC_FEE", "3000");
            processingFeeRate = configService.getBigDecimalConfig("REMITTANCE_NORMAL_FEE_RATE", "0.005");
        }

        BigDecimal finalAppliedRate = currencyCalculator.calculateFinalRate(baseRate, spread, preferenceRate);
        BigDecimal baseKrwAmount = foreignAmount.multiply(finalAppliedRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal processingFee = baseKrwAmount.multiply(processingFeeRate).setScale(0, RoundingMode.HALF_UP);

        BigDecimal totalFeeAmount = telegraphicFee.add(processingFee);
        BigDecimal totalPayment = baseKrwAmount.add(totalFeeAmount);

        return FeeDTO.Response.builder()
                .baseKrwAmount(baseKrwAmount)
                .telegraphicFee(telegraphicFee)
                .processingFee(processingFee)
                .totalFeeAmount(totalFeeAmount)
                .totalPayment(totalPayment)
                .build();
    }

    @Transactional(readOnly = true)
    public List<RemittanceDTO.ListResponse> getAllRemittances() {
        return remittanceRepository.findAll().stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(remittance -> RemittanceDTO.ListResponse.builder()
                        .id(remittance.getId())
                        .requesterId(remittance.getRequesterId())
                        .receiverName(remittance.getReceiverName())
                        .krwAmount(remittance.getKrwAmount())
                        .foreignCurrencyAmount(remittance.getForeignCurrencyAmount())
                        .currency(remittance.getCurrency())
                        .status(remittance.getStatus().name())
                        .requestedAt(remittance.getCreatedAt() != null ?
                                remittance.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "-")
                        .build())
                .collect(Collectors.toList());
    }
}