package me.projectexledger.domain.settlement.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.settlement.service.SettlementEngineService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementScheduler {

    private final SettlementEngineService settlementEngineService;


    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void runDailySettlementJob() {
        log.info("⏰ [Scheduler] 새벽 3시 자동 정산/대사 배치를 시작합니다.");

        try {
            // 1. 타겟 날짜 계산: 새벽 3시에 돌기 때문에, '어제' 발생한 결제 건을 정산해야 합니다.
            LocalDate yesterday = LocalDate.now().minusDays(1);
            String targetDate = yesterday.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            log.info("📊 [Scheduler] 대상 일자: {}", targetDate);

            // 2. 엔진 가동 (포트원 데이터 동기화 및 대조 로직 실행)
            settlementEngineService.processDailySettlement(targetDate);

            log.info("✅ [Scheduler] 자동 정산 배치가 성공적으로 완료되었습니다.");

        } catch (Exception e) {
            //  스케줄러가 돌다가 에러가 나면 서버가 죽지 않도록 예외 처리가 필수입니다!
            log.error("❌ [Scheduler] 자동 정산 배치 중 치명적인 오류 발생: {}", e.getMessage(), e);

        }
    }
}