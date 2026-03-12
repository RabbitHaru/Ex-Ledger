import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import http from "../../config/http";
import { RefreshCcw } from 'lucide-react';

export interface DashboardSummary {
  totalPaymentAmount: number;
  totalRemittanceCount: number;
  completedRemittanceCount: number;
  pendingRemittanceCount: number;
  failedRemittanceCount: number;
  rejectedRemittanceCount: number;
  discrepancyCount: number;
  waitingRemittanceCount: number;
}

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchDashboardSummary = async () => {
    try {
      const response: any = await http.get("/admin/settlements/dashboard?months=3");
      if (response && response.data && response.data.status === 'SUCCESS') {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response: any = await http.get("/admin/settlements/sync");
      if (response && response.data && response.data.status === 'SUCCESS') {
        toast.success("포트원 결제 데이터 동기화 완료!");
        await fetchDashboardSummary();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const normalProcessCount = summary ? (summary.completedRemittanceCount + summary.pendingRemittanceCount) : 0;
  // 조치 필요 항목 = 송금 실패 + 반려 처리
  const actionRequiredCount = summary ? (summary.failedRemittanceCount + (summary.rejectedRemittanceCount || 0)) : 0;

  return (
    <>
      <main className="flex-grow w-full px-4 py-8 mx-auto space-y-6 max-w-7xl sm:px-6 lg:px-8">
        <section className="flex items-center justify-between p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">최근 3개월 정산 요약</h2>
            <p className="mt-1 text-sm text-gray-500">최근 3개월 간의 플랫폼 자금 흐름과 정산/송금 현황을 파악하세요.</p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#007b70] rounded-lg hover:bg-teal-800 transition shadow-sm ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSyncing ? "동기화 중..." : "실시간 동기화"}
          </button>
        </section>

        {summary ? (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-xl">
              <h3 className="text-sm font-semibold text-gray-500">전체 처리 건수</h3>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-4xl font-extrabold text-gray-900 tabular-nums">{summary.totalRemittanceCount}</p>
                <p className="text-sm font-medium text-gray-400">건</p>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500">누적 정산 금액</h3>
                <p className="mt-2 text-3xl font-extrabold leading-tight text-gray-900">
                  {summary.totalPaymentAmount?.toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="p-8 bg-white border border-gray-100 shadow-sm rounded-xl">
              <h3 className="text-sm font-semibold text-gray-500">정상 프로세스 진행</h3>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-4xl font-extrabold text-gray-900 tabular-nums">{normalProcessCount}</p>
                <p className="text-sm font-medium text-gray-400">건 (정상)</p>
              </div>
              <div className="pt-6 mt-6 space-y-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">정산 완료</span>
                  <div className="flex items-center">
                    <span className="w-12 font-bold text-right text-gray-900 tabular-nums">{summary.completedRemittanceCount}</span>
                    <span className="ml-1 font-bold text-gray-900">건</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-600">정산 중</span>
                  <div className="flex items-center">
                    <span className="w-12 font-bold text-right text-gray-800 tabular-nums">{summary.pendingRemittanceCount}</span>
                    <span className="ml-1 font-bold text-gray-800">건</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border border-red-100 shadow-sm bg-red-50/30 rounded-xl">
              <h3 className="text-sm font-semibold text-red-800">조치 필요 항목</h3>
              <div className="flex items-baseline gap-2 mt-4">
                <p className="text-4xl font-extrabold text-red-700 tabular-nums">{actionRequiredCount}</p>
                <p className="text-sm font-medium text-red-400">건 (확인 요망)</p>
              </div>
              <div className="pt-6 mt-6 space-y-4 border-t border-red-100">
              <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-red-600">송금 실패</span>
                  <div className="flex items-center">
                    <span className="w-12 font-bold text-right text-orange-700 tabular-nums">{summary.failedRemittanceCount}</span>
                    <span className="ml-1 font-bold text-orange-700">건</span>
                  </div>
                </div>
                {/* 🌟 명칭 변경: 반려 처리 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-rose-600">반려 처리</span>
                  <div className="flex items-center">
                    <span className="w-12 font-bold text-right text-rose-700 tabular-nums">{summary.rejectedRemittanceCount || 0}</span>
                    <span className="ml-1 font-bold text-rose-700">건</span>
                  </div>
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
          <a href="/admin/list" className="text-sm font-bold text-[#007b70] hover:underline flex items-center gap-1">
            상세 대사 리스트 확인하기 →
          </a>
        </div>
      </main>

      {isSyncing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-50">
              <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="mb-3 text-xl font-black tracking-tight text-slate-900">
              플랫폼 데이터 동기화 중...
            </h3>
            <p className="text-sm font-bold leading-relaxed text-slate-500">
              실시간 데이터를 안전하게 동기화하고 있습니다.<br />
              잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;