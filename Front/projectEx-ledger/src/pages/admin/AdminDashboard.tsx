import React, { useState, useEffect } from "react";

// 1. 타입 정의 (모든 상태 필드 포함)
export interface DashboardSummary {
  totalPaymentAmount: number;
  totalRemittanceCount: number;
  completedRemittanceCount: number;
  pendingRemittanceCount: number;
  failedRemittanceCount: number;
  discrepancyCount: number;
  inProgressRemittanceCount: number; // 송금 중
  waitingRemittanceCount: number;    // 승인 대기
}

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch("/api/admin/settlements/dashboard");
      if (response.ok) {
        const result = await response.json();
        setSummary(result.data); 
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/settlements/sync", { method: "GET" });
      if (response.ok) {
        alert("포트원 결제 데이터 동기화 완료! ✅");
        await fetchDashboardSummary(); 
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 font-bold text-white bg-[#007b70] rounded">E</div>
            <span className="text-xl font-bold text-gray-900">
              Ex-Ledger <span className="ml-2 text-sm font-normal text-[#007b70]">관리자 센터</span>
            </span>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#007b70] rounded-md hover:bg-teal-800 transition">
            로그아웃
          </button>
        </div>
      </header>

      <main className="px-4 py-8 mx-auto space-y-6 max-w-7xl sm:px-6 lg:px-8">
        {/* 상단 타이틀 섹션 */}
        <section className="flex items-center justify-between p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">오늘의 정산 요약</h2>
            <p className="mt-1 text-sm text-gray-500">플랫폼 자금 흐름과 정산/송금 현황을 파악하세요.</p>
          </div>
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#007b70] rounded-lg hover:bg-teal-800 transition shadow-sm"
          >
            🔄 실시간 동기화
          </button>
        </section>

        {summary ? (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 카드 1: 누적 결제 금액 */}
            <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-xl">
              <h3 className="text-sm font-semibold text-gray-500">누적 결제 금액</h3>
              <p className="mt-4 text-4xl font-extrabold text-gray-900">
                {summary.totalPaymentAmount?.toLocaleString()} <span className="text-xl font-medium text-gray-400 ml-1">원</span>
              </p>
            </div>

            {/* 카드 2: 정산 프로세스 현황 (송금 중 건수 반영!) */}
            <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-xl">
              <h3 className="text-sm font-semibold text-gray-500">정산 프로세스 현황</h3>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-4xl font-extrabold text-gray-900">{summary.totalRemittanceCount}</p>
                <p className="text-sm font-medium text-gray-400">건 (전체)</p>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium flex items-center gap-1">✅ 정산 완료</span>
                  <span className="font-bold text-green-600">{summary.completedRemittanceCount} 건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium flex items-center gap-1">🌀 송금 중</span>
                  {/* 🚨 여기에 숫자가 나오게 수정했습니다! */}
                  <span className="font-bold text-blue-600">{summary.inProgressRemittanceCount} 건</span>
                </div>
              </div>
            </div>

            {/* 카드 3: 조치 필요 항목 (승인 대기 건수 반영!) */}
            <div className="p-8 bg-red-50/30 border border-red-100 shadow-sm rounded-xl">
              <h3 className="text-sm font-semibold text-red-800">조치 필요 항목</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600 font-medium flex items-center gap-1">🚨 오차 발생</span>
                  <span className="font-bold text-red-700">{summary.discrepancyCount} 건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-600 font-medium flex items-center gap-1">❌ 송금 실패</span>
                  <span className="font-bold text-orange-700">{summary.failedRemittanceCount} 건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-600 font-medium flex items-center gap-1">⏳ 송금 대기</span>
                  <span className="font-bold text-yellow-700">{summary.pendingRemittanceCount} 건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-600 font-medium flex items-center gap-1">📑 승인 대기</span>
                  {/* 🚨 여기에 숫자가 나오게 수정했습니다! */}
                  <span className="font-bold text-purple-700">{summary.waitingRemittanceCount} 건</span>
                </div>
              </div>
            </div>

          </section>
        ) : (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-100 rounded-xl">
            데이터를 불러오는 중입니다...
          </div>
        )}

        <div className="flex justify-end">
          <a href="/list" className="text-sm font-bold text-[#007b70] hover:underline flex items-center gap-1">
            상세 대사 리스트 확인하기 →
          </a>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;