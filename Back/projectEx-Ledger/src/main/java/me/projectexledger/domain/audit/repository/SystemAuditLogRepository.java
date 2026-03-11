package me.projectexledger.domain.audit.repository;

import me.projectexledger.domain.audit.entity.SystemAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface SystemAuditLogRepository extends JpaRepository<SystemAuditLog, Long> {
    Page<SystemAuditLog> findAllByOrderByIdDesc(Pageable pageable);

    @Query("SELECT l FROM SystemAuditLog l WHERE " +
           "(:userEmail IS NULL OR l.userEmail LIKE %:userEmail%) AND " +
           "(:keyword IS NULL OR l.action LIKE %:keyword% OR l.requestUri LIKE %:keyword%) AND " +
           "(:startDate IS NULL OR l.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR l.createdAt <= :endDate) AND " +
           "(:errorOnly = false OR l.errorMessage IS NOT NULL) " +
           "ORDER BY l.id DESC")
    Page<SystemAuditLog> searchLogs(
            @Param("userEmail") String userEmail,
            @Param("keyword") String keyword,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("errorOnly") boolean errorOnly,
            Pageable pageable
    );
}
