package me.projectexledger.domain.audit.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.audit.dto.AuditLogResponse;
import me.projectexledger.domain.audit.repository.SystemAuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final SystemAuditLogRepository auditLogRepository;

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByIdDesc(pageable)
                .map(AuditLogResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchAuditLogs(
            String userEmail, String keyword,
            LocalDateTime startDate, LocalDateTime endDate,
            boolean errorOnly, Pageable pageable) {
        return auditLogRepository.searchLogs(
                userEmail != null && !userEmail.isBlank() ? userEmail : null,
                keyword != null && !keyword.isBlank() ? keyword : null,
                startDate, endDate, errorOnly, pageable
        ).map(AuditLogResponse::from);
    }
}
