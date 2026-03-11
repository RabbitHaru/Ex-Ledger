package me.projectexledger.domain.settlement.service;

import me.projectexledger.domain.settlement.dto.SettlementSummaryDto;
import me.projectexledger.domain.settlement.dto.TransactionDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.List;
import java.io.PrintWriter;

public interface SettlementService {
    List<SettlementSummaryDto> calculateAllCompaniesSummary();
    Page<TransactionDto> getBusinessLogs(Long companyId, LocalDate startDate, LocalDate endDate, Pageable pageable);
    void finalizeSettlement(Long companyId, String period);
    void writeSettlementCsv(PrintWriter writer);
}