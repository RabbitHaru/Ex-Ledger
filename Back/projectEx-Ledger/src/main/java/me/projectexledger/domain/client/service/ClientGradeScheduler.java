package me.projectexledger.domain.client.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.entity.Client;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClientGradeScheduler {

    private final ClientRepository clientRepository;
    private final ClientGradeService clientGradeService; // 🌟 A님이 만든 핵심 로직 주입

    /**
     * 매일 밤 12시 정각(00:00:00)에 모든 가맹점의 등급을 자동 심사합니다.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void processDailyGradeUpdate() {
        log.info("[Scheduler] 🌙 자정입니다. 전 가맹점 VIP 승급/강등 자동 심사를 시작합니다.");

        // 1. DB에 있는 모든 가맹점을 불러옵니다.
        List<Client> allClients = clientRepository.findAll();

        int upgradeCount = 0;
        int downgradeCount = 0;

        // 2. 가맹점을 하나씩 돌면서 A님이 만든 심사 로직에 넣습니다.
        for (Client client : allClients) {
            try {
                // 🌟 핵심: 기존 ClientGradeService의 로직을 그대로 재사용!
                clientGradeService.updateClientGrade(client.getName());

                // (선택) 로그용 카운트
                if ("VIP".equals(client.getGrade().name())) upgradeCount++;
                else downgradeCount++;

            } catch (Exception e) {
                log.error("[Scheduler] 🚨 {} 가맹점 등급 업데이트 중 오류 발생: {}", client.getName(), e.getMessage());
            }
        }

        log.info("[Scheduler] ☀️ 자동 심사 완료! (현재 VIP: {}곳, 일반: {}곳)", upgradeCount, downgradeCount);
    }
}