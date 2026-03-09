package me.projectexledger.domain.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationResponse {
    private String type;        // 알림 유형 (예: "STATUS_UPDATE")
    private String status;      // 변경된 상태 (WAITING, PENDING 등)
    private String message;     // 사용자에게 보여줄 메시지
    private String timestamp;   // 발생 시각
}