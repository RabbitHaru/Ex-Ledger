package me.projectexledger.domain.client.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// 💡 시니어 가이드: A님의 record 문법을 유지하면서, 어드민 화면에 필요한 수수료율과 상태를 추가했습니다.
public record ClientPendingDTO(
        Long clientId,
        String companyName,
        String businessRegistrationNumber,
        String contactEmail,
        String status,
        BigDecimal feeRate,
        LocalDateTime requestedAt
) {}