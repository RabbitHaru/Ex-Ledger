package me.projectexledger.domain.remittance.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.remittance.dto.FeeDTO;
import me.projectexledger.domain.remittance.dto.RemittanceDTO;
import me.projectexledger.domain.remittance.entity.Remittance;
import me.projectexledger.domain.remittance.entity.RemittanceStatus;
import me.projectexledger.domain.remittance.repository.RemittanceRepository;
import me.projectexledger.domain.exchange.service.CurrencyCalculator;
import me.projectexledger.domain.config.service.SystemConfigService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.text.NumberFormat;
import java.util.stream.Collectors;

import me.projectexledger.domain.notification.service.SseEmitters;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class RemittanceService {

    private final RemittanceRepository remittanceRepository;
    private final CurrencyCalculator currencyCalculator;
    private final SystemConfigService configService;
    private final SseEmitters sseEmitters;
    private final MemberRepository memberRepository;

    @Transactional
    public RemittanceDTO.Response processRemittanceRequest(String requesterId, RemittanceDTO.Request requestDTO) {
        // ★ 보안 강화: MFA 쿨다운 체크 (재설정 후 24시간 제한)
        Member member = memberRepository.findByEmail(requesterId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        if (member.getMfaResetAt() != null) {
            long hoursSinceReset = ChronoUnit.HOURS.between(member.getMfaResetAt(), LocalDateTime.now());
            if (hoursSinceReset < 24) {
                long remainingMinutes = 1440 - ChronoUnit.MINUTES.between(member.getMfaResetAt(), LocalDateTime.now());
                long h = remainingMinutes / 60;
                long m = remainingMinutes % 60;
                throw new IllegalStateException(String.format("보안을 위해 OTP 재설정 후 24시간 동안 송금이 금지됩니다. (남은 시간: %d시간 %d분)", h, m));
            }
        }

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
                .status(RemittanceStatus.WAITING)
                .build();

        remittanceRepository.save(remittance);

        String transactionId = "TRX_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "_" + UUID.randomUUID().toString().substring(0, 8);

        // 실시간 알림 발송
        String notiMsg = String.format("[송금 요청] %s %s %s → %s 접수 완료",
                requestDTO.getCurrency(), requestDTO.getAmount(), requestDTO.getRecipientName(), requestDTO.getRecipientBank());
        sseEmitters.sendRemittanceNotification(requesterId, notiMsg);

        memberRepository.findByAccountNumber(requestDTO.getRecipientAccount())
                .filter(Member::isApproved)
                .ifPresent(receiver -> {
                    NumberFormat nf = NumberFormat.getNumberInstance(Locale.KOREA);
                    String amountKrw = requestDTO.getTotalPayment() != null ? nf.format(requestDTO.getTotalPayment()) : "-";
                    String senderName = member.getName() != null ? member.getName() : "사용자";
                    String depositMsg = String.format("방금 %s님으로부터 ₩%s이 입금되었습니다", senderName, amountKrw);
                    sseEmitters.sendDepositNotification(receiver.getEmail(), depositMsg);
                });

        return RemittanceDTO.Response.builder()
                .transactionId(transactionId)
                .status(remittance.getStatus().name())
                .requestedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();
    }

    public FeeDTO.Response calculateRemittanceFee(BigDecimal foreignAmount, BigDecimal baseRate, String currency, String clientGrade) {
        boolean is100Unit = currency.contains("(100)") || currency.equals("JPY") || currency.equals("IDR");

        BigDecimal spread = configService.getBigDecimalConfig("BANK_SPREAD_RATE", "20.0");
        BigDecimal preferenceRate;
        BigDecimal telegraphicFee;
        BigDecimal processingFeeRate;

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
        BigDecimal adjustedAmount = is100Unit ? foreignAmount.divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP) : foreignAmount;

        BigDecimal baseKrwAmount = adjustedAmount.multiply(finalAppliedRate).setScale(0, RoundingMode.HALF_UP);
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
