package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientGrade;
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.domain.company.service.SettlementPolicyService;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClientGradeService {

    private final ClientRepository clientRepository;
    private final SettlementRepository settlementRepository;
    private final SettlementPolicyService policyService;

    @Transactional
    public void updateClientGrade(String clientName) {
        // 1. 기준점 계산: 현재 시간으로부터 정확히 1개월(30일) 전
        LocalDateTime oneMonthAgo = LocalDateTime.now().minusMonths(1);

        // 2. 가맹점의 최근 1개월 누적 정산액 조회
        BigDecimal monthlyTotal = settlementRepository.sumMonthlyAmount(clientName, oneMonthAgo);
        if (monthlyTotal == null) {
            monthlyTotal = BigDecimal.ZERO;
        }

        BigDecimal threshold = new BigDecimal("200000000"); // 2억 기준

        Client client = clientRepository.findByName(clientName).orElseThrow();

        if (monthlyTotal.compareTo(threshold) >= 0) {
            log.info("[Grade] {} 가맹점 파트너 승격!", clientName);
            client.setGrade(ClientGrade.PARTNER); // VIP -> PARTNER

            // 승격 시 즉시 파트너 정책 적용
            policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                    new BigDecimal("0.005"), BigDecimal.ZERO, new BigDecimal("2.0"), new BigDecimal("1.0")
            ));
        } else {
            client.setGrade(ClientGrade.GENERAL);
            // 일반 정책 복구
            policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                    new BigDecimal("0.015"), new BigDecimal("2000"), new BigDecimal("10.0"), new BigDecimal("0.90")
            ));
        }
    }
}