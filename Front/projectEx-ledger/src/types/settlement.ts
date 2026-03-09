// 백엔드의 DashboardSummaryResponse 와 1:1 매칭
export interface DashboardSummary {
  totalSettlementAmount: number;
  pendingCount: number;
}

// 백엔드의 ReconciliationDto 와 1:1 매칭
export interface ReconciliationItem {
  settlementId: number;
  clientName: string;
  originalAmount: number;
  settlementAmount: number;
  status: "COMPLETED" | "DISCREPANCY" | "WAITING"; // 리터럴 타입으로 안정성 확보
  requestedAt: string; // ISO 8601 문자열 포맷
}
