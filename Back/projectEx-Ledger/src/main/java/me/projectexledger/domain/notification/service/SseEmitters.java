package me.projectexledger.domain.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SseEmitters {

    // 🌟 Thread-safe한 Map으로 셀러별 연결 관리
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter add(String userId) {
        // 만료 시간 1시간 설정 (금융 대시보드 특성 반영)
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L);
        this.emitters.put(userId, emitter);

        // 연결 종료/만료 시 메모리 누수 방지를 위해 Map에서 제거
        emitter.onCompletion(() -> {
            log.info("SSE 연결 종료: {}", userId);
            this.emitters.remove(userId);
        });
        emitter.onTimeout(() -> {
            log.warn("SSE 연결 만료: {}", userId);
            this.emitters.remove(userId);
        });

        try {
            // 🌟 최초 연결 시 프론트엔드의 .addEventListener("connect", ...)와 매칭
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("connected!"));
        } catch (IOException e) {
            log.error("SSE 초기 연결 알림 실패: {}", e.getMessage());
        }

        return emitter;
    }

    public void sendNotification(String userId, String message) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("remittance_update")
                        .data(message));
                log.info("🔔 [SSE] 알림 발송 성공: 셀러({}) -> {}", userId, message);
            } catch (IOException e) {
                log.error("❌ [SSE] 알림 발송 실패, 세션 제거: {}", userId);
                emitters.remove(userId);
            }
        }
    }
}