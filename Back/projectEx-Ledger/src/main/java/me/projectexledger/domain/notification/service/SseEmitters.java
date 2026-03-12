package me.projectexledger.domain.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.projectexledger.domain.member.entity.Member;
import me.projectexledger.domain.member.repository.MemberRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class SseEmitters {

    private final MemberRepository memberRepository;

    // Thread-safe한 Map으로 사용자별 연결 관리
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();
    
    // 비로그인 사용자용 공용 SSE 연결 관리
    private final Map<String, SseEmitter> publicEmitters = new ConcurrentHashMap<>();

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    public SseEmitter add(String userId) {
        // 만료 시간 1시간 설정 (금융 대시보드 특성 반영)
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L);
        this.emitters.put(userId, emitter);

        emitter.onCompletion(() -> {
            log.info("SSE 연결 종료: {}", userId);
            this.emitters.remove(userId);
        });
        emitter.onTimeout(() -> {
            log.warn("SSE 연결 만료: {}", userId);
            this.emitters.remove(userId);
        });

        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("connected!"));
        } catch (IOException e) {
            log.error("SSE 초기 연결 알림 실패: {}", e.getMessage());
        }

        return emitter;
    }

    /**
     * 비로그인 사용자용 (메인 페이지 환율 정보 조회용)
     */
    public SseEmitter addPublic(String clientId) {
        SseEmitter emitter = new SseEmitter(60 * 60 * 1000L);
        this.publicEmitters.put(clientId, emitter);

        emitter.onCompletion(() -> this.publicEmitters.remove(clientId));
        emitter.onTimeout(() -> this.publicEmitters.remove(clientId));

        try {
            emitter.send(SseEmitter.event().name("connect").data("public connected"));
        } catch (IOException e) {
            this.publicEmitters.remove(clientId);
        }

        return emitter;
    }

    /**
     * 특정 사용자에게 알림 발송 (알림 수신 설정 체크)
     */
    public void sendNotification(String userId, String eventType, String message) {
        // 알림 수신 설정 체크
        if (!isNotificationAllowed(userId)) {
            log.debug("알림 수신 거부 사용자: {}", userId);
            return;
        }

        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                String payload = message + " | " + LocalDateTime.now().format(TIME_FMT);
                emitter.send(SseEmitter.event()
                        .name(eventType)
                        .data(payload));
                log.info("🔔 [SSE] 알림 발송 성공: {}({}) -> {}", userId, eventType, message);
            } catch (IOException e) {
                log.error("❌ [SSE] 알림 발송 실패, 세션 제거: {}", userId);
                emitters.remove(userId);
            }
        }
    }

    /**
     * 송금 관련 알림
     */
    public void sendRemittanceNotification(String userId, String message) {
        sendNotification(userId, "remittance_update", message);
    }

    public void sendDepositNotification(String userId, String message) {
        sendNotification(userId, "deposit_alert", message);
    }

    public void sendAdminAlert(String message) {
        for (Member admin : memberRepository.findByRole(Member.Role.ROLE_INTEGRATED_ADMIN)) {
            sendNotification(admin.getEmail(), "admin_alert", message);
        }
    }

    /**
     * 로그인 시도 경고 알림
     */
    public void sendLoginAlert(String userId, String message) {
        sendNotification(userId, "login_alert", message);
    }

    /**
     * 전체 사용자에게 공지 브로드캐스트
     */
    public void broadcastAnnouncement(String message) {
        String payload = message + " | " + LocalDateTime.now().format(TIME_FMT);
        int successCount = 0;

        for (Map.Entry<String, SseEmitter> entry : emitters.entrySet()) {
            try {
                entry.getValue().send(SseEmitter.event()
                        .name("announcement")
                        .data(payload));
                successCount++;
            } catch (IOException e) {
                log.error("❌ [SSE] 공지 발송 실패 ({}), 세션 제거", entry.getKey());
                emitters.remove(entry.getKey());
            }
        }

        log.info("📢 [SSE] 공지 브로드캐스트 완료: {} / {} 명 수신", successCount, emitters.size() + successCount);
    }

    /**
     * 실시간 환율 정보 브로드캐스트 (로그인/비로그인 전체)
     */
    public void broadcastExchangeUpdate(Object data) {
        // publicEmitters에 발송
        for (Map.Entry<String, SseEmitter> entry : publicEmitters.entrySet()) {
            try {
                entry.getValue().send(SseEmitter.event()
                        .name("exchange-update")
                        .data(data));
            } catch (IOException e) {
                publicEmitters.remove(entry.getKey());
            }
        }

        // emitters (로그인 사용자)에게도 발송 (필요시)
        for (Map.Entry<String, SseEmitter> entry : emitters.entrySet()) {
            try {
                entry.getValue().send(SseEmitter.event()
                        .name("exchange-update")
                        .data(data));
            } catch (IOException e) {
                emitters.remove(entry.getKey());
            }
        }
    }

    /**
     * 알림 수신 허용 여부 확인
     */
    private boolean isNotificationAllowed(String userId) {
        try {
            return memberRepository.findByEmail(userId)
                    .map(Member::isAllowNotifications)
                    .orElse(true);
        } catch (Exception e) {
            log.warn("알림 수신 설정 확인 실패, 기본 허용: {}", userId);
            return true;
        }
    }
}
