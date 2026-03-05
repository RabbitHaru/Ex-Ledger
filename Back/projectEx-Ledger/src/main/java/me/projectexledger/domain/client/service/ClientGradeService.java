package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
// 프로젝트 구조에 맞게 아래 import 경로들은 IDE(IntelliJ 등)의 자동 완성(Alt+Enter)으로 맞춰주세요.
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientGrade; // VIP, GENERAL 상태값
import me.projectexledger.domain.settlement.repository.SettlementRepository;
import me.projectexledger.domain.company.service.SettlementPolicyService;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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
        // 1. 이번 달 1일 00:00:00 기준점 계산
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        // 2. 가맹점의 이번 달 누적 정산액 조회 (없으면 0원 처리)
        BigDecimal monthlyTotal = settlementRepository.sumMonthlyAmount(clientName, startOfMonth);
        if (monthlyTotal == null) {
            monthlyTotal = BigDecimal.ZERO;
        }

        // 3. VIP 기준 금액 설정 (2억 원)
        BigDecimal threshold = new BigDecimal("200000000");

        Client client = clientRepository.findByName(clientName)
                .orElseThrow(() -> new IllegalArgumentException("해당 가맹점을 찾을 수 없습니다: " + clientName));

        // 4. 등급 판정 및 수수료 정책 자동 업데이트
        if (monthlyTotal.compareTo(threshold) >= 0) {
            log.info("[Grade] 👑 {} 가맹점이 이번 달 2억 원을 달성하여 VIP로 승급됩니다!", clientName);
            client.setGrade(ClientGrade.VIP);

            // VIP 전용 정책: 수수료 0.5%, 전신료 0원, 환율 마진 5.0, 환율 우대 100%
            policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                    new BigDecimal("0.005"), BigDecimal.ZERO, new BigDecimal("5.0"), new BigDecimal("1.00")
            ));
        } else {
            client.setGrade(ClientGrade.GENERAL);

            // 일반 사용자 정책 복원: 수수료 1.5%, 전신료 2000원, 환율 마진 10.0, 환율 우대 90%
            policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                    new BigDecimal("0.015"), new BigDecimal("2000"), new BigDecimal("10.0"), new BigDecimal("0.90")
            ));
        }
    }
}