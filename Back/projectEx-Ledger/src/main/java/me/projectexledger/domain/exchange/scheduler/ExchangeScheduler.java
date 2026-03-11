package me.projectexledger.domain.exchange.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.exchange.service.ExchangeRateService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExchangeScheduler {
    private final ExchangeRateService exchangeRateService;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationStart() {
        log.info("--- [초기화] 환율 수집 프로세스 시작 ---");
        processExchangeTasks();
    }

    @Scheduled(cron = "0 0 1,11 * * *", zone = "Asia/Seoul")
    public void scheduleExchangeUpdateTask() {
        log.info("--- [정기] 환율 수집 시작 ---");
        processExchangeTasks();
    }

    private void processExchangeTasks() {
        try {
            exchangeRateService.updateAndCacheRates();
            LocalDateTime threshold = LocalDateTime.now().minusDays(14);
            exchangeRateService.cleanupOldRates(threshold);
            log.info("환율 최신화 및 14일 경과 데이터 청소 완료");
        } catch (Exception e) {
            log.error("환율 스케줄링 오류: {}", e.getMessage());
        }
    }
}