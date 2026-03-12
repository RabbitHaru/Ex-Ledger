package me.projectexledger.domain.settlement.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.settlement.dto.SettlementSummaryDto;
import me.projectexledger.domain.settlement.dto.TransactionDto;
import me.projectexledger.domain.settlement.service.SettlementService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/settlement")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ROLE_INTEGRATED_ADMIN')")
    public ResponseEntity<List<SettlementSummaryDto>> getAllSettlementSummary() {
        return ResponseEntity.ok(settlementService.calculateAllCompaniesSummary());
    }

    @GetMapping("/company/{companyId}/details")
    @PreAuthorize("hasRole('ROLE_INTEGRATED_ADMIN')")
    public ResponseEntity<Page<TransactionDto>> getCompanyDetails(
            @PathVariable Long companyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        return ResponseEntity.ok(settlementService.getBusinessLogs(companyId, startDate, endDate, pageable));
    }

    @GetMapping("/export/csv")
    @PreAuthorize("hasRole('ROLE_INTEGRATED_ADMIN')")
    public void exportSettlementCsv(HttpServletResponse response) {
        try {
            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=settlement_report.csv");
            settlementService.writeSettlementCsv(response.getWriter());
        } catch (Exception e) {
            throw new RuntimeException("CSV 생성 중 오류 발생", e);
        }
    }
}