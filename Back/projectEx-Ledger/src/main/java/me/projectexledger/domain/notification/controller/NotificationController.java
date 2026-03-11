package me.projectexledger.domain.notification.controller;

import lombok.RequiredArgsConstructor;
import me.projectexledger.common.dto.ApiResponse;
import me.projectexledger.domain.notification.service.SseEmitters;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SseEmitters sseEmitters;

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal UserDetails userDetails) {
        return sseEmitters.add(userDetails.getUsername());
    }

    /**
     * 관리자 전용: 전체 사용자에게 공지 브로드캐스트
     */
    @PreAuthorize("hasRole('INTEGRATED_ADMIN')")
    @PostMapping("/broadcast")
    public ApiResponse<Void> broadcastAnnouncement(@RequestBody Map<String, String> body) {
        String message = body.get("message");
        if (message == null || message.isBlank()) {
            return ApiResponse.fail("공지 내용을 입력해주세요.");
        }
        sseEmitters.broadcastAnnouncement(message);
        return ApiResponse.success("전체 공지가 발송되었습니다.", null);
    }
}