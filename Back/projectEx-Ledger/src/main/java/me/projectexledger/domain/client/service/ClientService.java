package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import me.projectexledger.domain.client.entity.ClientStatus;
import me.projectexledger.domain.client.entity.ClientGrade;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientService {

    private final ClientRepository clientRepository;

    @Transactional(readOnly = true)
    public List<Client> getPendingClients() {
        return clientRepository.findByStatus(ClientStatus.PENDING);
    }

    // 🌟 [수정] feeRate 파라미터 삭제. 승인 시 기본 등급(GENERAL)만 부여합니다.
    public void approveClient(Long clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("해당 기업을 찾을 수 없습니다."));

        client.approve();
        client.setGrade(ClientGrade.GENERAL);
        // 💡 개별 정책을 억지로 만들지 않아도, 정산 시 시스템이 GENERAL 기본 정책을 자동으로 끌어다 씁니다.
    }

    @Transactional(readOnly = true)
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    // 🌟 [수정] 복잡했던 수수료 개별 업데이트 메서드 폐기 -> '등급 수동 변경' 기능으로 단순화
    public void updateClientGrade(String merchantId, ClientGrade grade) {
        Client client = clientRepository.findAll().stream()
                .filter(c -> merchantId.equals(c.getMerchantId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("해당 가맹점을 찾을 수 없습니다."));

        client.updateGradeStatus(grade); // 엔티티의 등급만 변경
    }
}