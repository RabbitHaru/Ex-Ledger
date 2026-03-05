package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.company.service.SettlementPolicyService;
import me.projectexledger.domain.settlement.dto.SettlementPolicyUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * [Member A 담당] 수백 건 규모의 기업 고객 및 수수료 관리 서비스
 * 예비군 가기 전(3/8)까지 완공해야 할 핵심 비즈니스 로직입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;
    private final SettlementPolicyService policyService;
    // private final GoogleAuthService googleAuthService;

    /**
     * 가입 신청 중인 기업 목록을 가져옵니다 (수백 건 이내 최적화).
     */
    @Transactional(readOnly = true)
    public List<Client> getPendingClients() {
        return clientRepository.findByStatus(ClientStatus.PENDING);
    }

    /**
     * 기업 가입 승인 및 수수료 설정
     * 송금 로직이 돌아가기 위한 필수 선행 작업입니다.
     */
    public void approveClient(Long clientId, BigDecimal feeRate) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("해당 기업을 찾을 수 없습니다."));
        //  승인 전 가맹점주의 OTP 설정 여부를 확인합니다.
//        if (!googleAuthService.isMfaRegistered(client.getOwnerId())) {
//            throw new IllegalStateException("가맹점주가 아직 MFA(OTP)를 설정하지 않았습니다. 보안을 위해 OTP 설정 후 승인이 가능합니다.");
//        }

        client.approve(); // 상태를 APPROVED로 변경
        client.updateFeeRate(feeRate); // 소통된 수수료율 적용

        // save는 JPA 변경 감지(Dirty Checking)에 의해 자동으로 처리됩니다.

        policyService.updatePolicy(client.getMerchantId(), new SettlementPolicyUpdateRequest(
                feeRate,                   // 입력받은 기본 플랫폼 수수료
                new BigDecimal("2000"),    // 초기 네트워크 수수료 2000원
                new BigDecimal("10.0"),    // 초기 환전 마진
                new BigDecimal("0.90")     // 초기 환율 우대 90%
        ));
    }
}