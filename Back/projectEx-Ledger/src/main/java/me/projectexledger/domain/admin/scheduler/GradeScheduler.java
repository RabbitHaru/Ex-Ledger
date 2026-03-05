package me.projectexledger.domain.admin.scheduler;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.client.dto.repository.ClientRepository;
import me.projectexledger.domain.client.service.ClientGradeService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GradeScheduler {
    private final ClientGradeService gradeService;
    private final ClientRepository clientRepository;

    // 🌟 매일 새벽 3시에 전 가맹점 등급 갱신 실행
    @Scheduled(cron = "0 0 3 * * *")
    public void autoUpdateGrades() {
        clientRepository.findAll().forEach(client -> {
            gradeService.updateClientGrade(client.getName());
        });
    }
}