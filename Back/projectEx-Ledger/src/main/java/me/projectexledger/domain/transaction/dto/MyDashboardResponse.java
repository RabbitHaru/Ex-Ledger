package me.projectexledger.domain.transaction.dto;

import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class MyDashboardResponse {
    private BigDecimal totalSpentKrw;    // 총 지출 (원화 합계)
    private long pendingCount;           // 정산 대기/진행 중 건수
    private long settledCount;           // 정산 완료 건수
    private List<DailySpending> chartData; // 그래프용 일별 지출 추이

    @Getter
    @Builder
    public static class DailySpending {
        private String date;             // 날짜 (2026-03-03)
        private BigDecimal amount;       // 해당 날짜 지출 합계
    }
}