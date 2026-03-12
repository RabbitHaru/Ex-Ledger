package me.projectexledger.domain.settlement.service;

import lombok.RequiredArgsConstructor;
import me.projectexledger.domain.settlement.dto.SettlementSummaryDto;
import me.projectexledger.domain.settlement.dto.TransactionDto;
import me.projectexledger.domain.settlement.repository.SettlementRepository; // B담당자가 만들 예정
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service // 🌟 이 어노테이션이 있어야 에러가 사라집니다!
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementServiceImpl implements SettlementService {

    // private final SettlementRepository settlementRepository; // 실제 DB 연동 시 주석 해제

    @Override
    public List<SettlementSummaryDto> calculateAllCompaniesSummary() {
        // 🌟 A담당자가 원하는 수수료 로직 (0.3% 시뮬레이션)
        List<SettlementSummaryDto> summaries = new ArrayList<>();

        // 실제로는 DB에서 기업 리스트를 가져와서 반복문 처리
        long totalAmt = 1000000L; // 100만원 거래 가정
        long fee = (long) (totalAmt * 0.003); // 0.3% 수수료 계산

        summaries.add(SettlementSummaryDto.builder()
                .companyId(2L)
                .companyName("(주)엑스레저글로벌")
                .totalTransactionAmount(totalAmt)
                .totalServiceFee(fee)
                .netSettlementAmount(totalAmt - fee)
                .build());

        return summaries;
    }

    @Override
    public Page<TransactionDto> getBusinessLogs(Long companyId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        // DB에서 해당 기간의 BUSINESS 로그를 가져오는 로직 (B담당자 구현부)
        return Page.empty();
    }

    @Override
    @Transactional
    public void finalizeSettlement(Long companyId, String period) {
        // 정산 상태를 'APPROVED'로 바꾸는 로직
    }

    @Override
    public void writeSettlementCsv(PrintWriter writer) {
        // CSV 헤더 작성 및 데이터 출력 로직
        writer.println("Company,Date,Amount,Fee,Net");
        writer.println("(주)엑스레저글로벌,2026-03-11,1000000,3000,997000");
    }
}