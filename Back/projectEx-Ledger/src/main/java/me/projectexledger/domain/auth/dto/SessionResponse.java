package me.projectexledger.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    private String sessionId; // Redis key part
    private String clientIp;
    private String userAgent;
    private LocalDateTime loginTime;
    private boolean isCurrentSession;
}
