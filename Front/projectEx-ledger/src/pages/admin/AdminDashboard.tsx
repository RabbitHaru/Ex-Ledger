import React, { useState, useEffect } from "react";

// 1. 타입 정의
export interface Settlement {
  id: number;
  companyName: string;
  status: "PENDING" | "COMPLETED" | "DISCREPANCY" | "WAITING";
  originalAmount: number;
  settlementAmount: number;
  updatedAt: string;
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<Settlement[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 한국어 상태 이름표 매핑
  const statusLabels: Record<string, string> = {
    COMPLETED: "정산 완료",
    DISCREPANCY: "오차 발생",
    PENDING: "송금 대기",
    WAITING: "승인 대기",
  };

  // 2. 데이터 로드 함수
  const fetchSettlements = async () => {
    try {
      const response = await fetch("/api/admin/settlements/reconciliations");
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  // 3. 포트원 실시간 동기화
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/settlements/sync", { method: "GET" });
      if (response.ok) {
        alert("포트원 결제 데이터 동기화 완료! ✅");
        await fetchSettlements();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. 강제 완료 처리
  const handleForceComplete = async (settlementId: number, currentAmount: number) => {
    if (!window.confirm("이 건을 강제로 '정산 완료' 처리하시겠습니까?")) return;
    try {
      const response = await fetch(
        `/api/admin/settlements/${settlementId}/resolve?correctedAmount=${currentAmount}&reason=Admin_Manual_Approval`,
        { method: "POST" }
      );
      if (response.ok) {
        alert("처리가 완료되었습니다! ✅");
        await fetchSettlements();
      }
    } catch (error) {
      alert("서버 통신 실패");
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const filteredData = filterStatus === "ALL" ? data : data.filter((item) => item.status === filterStatus);

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 font-bold text-white bg-teal-700 rounded">E</div>
            <span className="text-xl font-bold text-gray-900">
              Ex-Ledger <span className="ml-2 text-sm font-normal text-teal-700">Admin Center</span>
            </span>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition">
            로그아웃
          </button>
        </div>
      </header>

      <main className="px-4 py-8 mx-auto space-y-6 max-w-7xl sm:px-6 lg:px-8">
        <section className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">일일 정산 처리 현황</h2>
              <p className="text-sm text-gray-500">포트원 V2 결제 내역을 긁어와 대조를 시작합니다.</p>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-6 py-2 text-sm font-bold rounded-full transition shadow-sm
                ${isSyncing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700 active:scale-95"}`}
            >
              {isSyncing ? "데이터 동기화 중..." : "포트원 실시간 동기화"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">상세 정산 로그</h3>
            
            {/* 🚨 [순서 변경] 정산완료 -> 오차발생 -> 송금대기 -> 승인대기 순 */}
            <select
              className="p-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-teal-500 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">전체 보기</option>
              <option value="COMPLETED">정산 완료</option>
              <option value="DISCREPANCY">오차 발생</option>
              <option value="PENDING">송금 대기</option>
              <option value="WAITING">승인 대기</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wider text-gray-500 uppercase border-b bg-gray-50">
                  <th className="p-4">기업명(주문ID)</th>
                  <th className="p-4 text-right">원천 금액</th>
                  <th className="p-4 text-right">최종 정산액</th>
                  <th className="p-4 text-center">상태</th>
                  <th className="p-4 text-center">업데이트 일시</th>
                  <th className="p-4 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((row) => (
                  <tr key={row.id} className="transition hover:bg-teal-50/30">
                    <td className="p-4 font-medium text-gray-800">{row.companyName}</td>
                    <td className="p-4 text-right text-gray-600">{row.originalAmount?.toLocaleString()}원</td>
                    <td className="p-4 text-right font-bold text-gray-900">{row.settlementAmount?.toLocaleString()}원</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full 
                        ${row.status === "COMPLETED" ? "bg-green-100 text-green-700" : 
                          row.status === "DISCREPANCY" ? "bg-red-100 text-red-700" : 
                          row.status === "WAITING" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {statusLabels[row.status] || row.status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-500">{row.updatedAt}</td>
                    <td className="p-4 text-center">
                      {(row.status === "PENDING" || row.status === "WAITING") && (
                        <button
                          onClick={() => handleForceComplete(row.id, row.settlementAmount)}
                          className="px-3 py-1 text-xs font-bold text-white bg-teal-600 rounded shadow-sm hover:bg-teal-700 active:scale-95 transition"
                        >
                          강제 완료
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;