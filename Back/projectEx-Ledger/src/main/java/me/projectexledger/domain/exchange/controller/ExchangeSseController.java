package me.projectexledger.domain.exchange.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.notification.service.SseEmitters;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExchangeSseController {

    private final SseEmitters sseEmitters;

    /**
     * 비로그인 사용자용 실시간 환율 SSE 연결
     */
    @GetMapping(value = "/connect", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connectExchange() {
        String clientId = UUID.randomUUID().toString();
        return sseEmitters.addPublic(clientId);
    }
}
