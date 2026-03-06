package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.client.entity.ClientGrade; // 🌟 새로 추가됨
import me.projectexledger.domain.company.service.SettlementPolicyService;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final SettlementPolicyService policyService;

    @Transactional(readOnly = true)
    public List<Client> getPendingClients() {
        return clientRepository.findByStatus(ClientStatus.PENDING);
    }

    public void approveClient(Long clientId, BigDecimal feeRate) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("해당 기업을 찾을 수 없습니다."));

        client.approve();
        client.updateFeeRate(feeRate);

        policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                feeRate,
                new BigDecimal("2000"),
                new BigDecimal("10.0"),
                new BigDecimal("0.90")
        ));
    }

    // =========================================================================
    // 🚀 [신규 추가 1] 전체 가맹점 목록 조회 (getAllClients 빨간 줄 해결!)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    // =========================================================================
    // 🚀 [신규 추가 2] 가맹점 등급 및 수수료 정책 DB 업데이트 (updateClientPolicy 빨간 줄 해결!)
    // =========================================================================
    public void updateClientPolicy(String merchantId, ClientGrade grade, BigDecimal platformFeeRate, BigDecimal preferenceRate) {

        // 가맹점 ID로 DB에서 해당 기업을 찾습니다.
        Client client = clientRepository.findAll().stream()
                .filter(c -> merchantId.equals(c.getMerchantId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("해당 가맹점을 찾을 수 없습니다."));

        // JPA의 변경 감지(Dirty Checking)를 통해 자동으로 DB 값이 수정됩니다.
        client.updatePolicy(grade, platformFeeRate, preferenceRate);
    }
}