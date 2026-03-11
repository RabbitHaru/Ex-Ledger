import type { ExchangeRate } from "../../../types/exchange";
import React, { Suspense, lazy, useState, useEffect } from "react";
import FXTicker from "../../widgets/finance/FXTicker";
import MiniConverter from "../../widgets/finance/MiniConverter";
import ExchangeRateTable from "../../widgets/finance/ExchangeRateTable";
import { BarChart3, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const ExchangeRateChart = lazy(
  () => import("../../widgets/finance/ExchangeRateChart"),
);

const ChartSkeleton = () => (
  <div className="w-full bg-slate-50 border border-slate-100 h-96 animate-pulse rounded-[32px] flex items-center justify-center">
    <span className="text-xs font-bold text-slate-400">
      차트 데이터를 불러오는 중...
    </span>
  </div>
);

const LandingPage: React.FC = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  // [수정] 테이블 클릭과 차트를 연동하기 위한 상태
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    // 초기 전체 환율 로드
    fetch("http://localhost:8080/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("데이터 로드 실패:", err));

    // SSE 실시간 업데이트 연결
    const eventSource = new EventSource("http://localhost:8080/api/connect");
    eventSource.addEventListener("exchange-update", (event: any) => {
      try {
        const newData = JSON.parse(event.data);
        setRates(Array.isArray(newData) ? newData : []);
      } catch (e) {
        console.error("데이터 파싱 에러:", e);
      }
    });
    return () => eventSource.close();
  }, []);

  // 상위 상승/하락 통화 계산
  const sortedByChange = [...rates].sort(
    (a, b) => (b.changeRate || 0) - (a.changeRate || 0),
  );
  const topGainer = rates.length > 0 ? sortedByChange[0] : null;
  const topLoser =
    rates.length > 0 ? sortedByChange[sortedByChange.length - 1] : null;

  return (
    <main className="flex flex-col min-h-screen gap-10 px-4 py-10 mx-auto max-w-7xl bg-slate-50/50">
      {/* 1. 요약 카드 섹션 */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { label: "최고 상승", data: topGainer },
          { label: "최대 하락", data: topLoser },
        ].map((mover, i) => (
          <div
            key={i}
            className="p-6 bg-white border border-slate-100 shadow-sm rounded-[32px] flex items-center justify-between transition-all hover:shadow-md"
          >
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {mover.label}
              </p>
              <h4 className="text-xl font-black text-slate-800">
                {mover.data?.curUnit}{" "}
                <span className="text-sm font-bold text-slate-400">
                  {mover.data?.curNm}
                </span>
              </h4>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black ${(mover.data?.changeRate || 0) > 0 ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"}`}
            >
              {(mover.data?.changeRate || 0) > 0 ? (
                <ArrowUpRight size={20} />
              ) : (
                <ArrowDownRight size={20} />
              )}
              <span className="text-lg">
                {(mover.data?.changeRate || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* 2. 메인 차트 섹션 */}
      <section className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px]">
        <h2 className="flex items-center gap-2 mb-8 text-xl font-black text-slate-800">
          <BarChart3 className="text-blue-600" size={20} /> 주요 통화 환율 추이
        </h2>
        <div className="w-full h-96">
          <Suspense fallback={<ChartSkeleton />}>
            {/* [핵심 수정] selectedCurrency를 차트에 전달하여 동기화 */}
            <ExchangeRateChart
              rates={rates}
              selectedCurrency={selectedCurrency}
            />
          </Suspense>
        </div>
      </section>

      {/* 3. 미니 계산기 섹션 */}
      <section className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px] max-w-4xl mx-auto w-full">
        <MiniConverter rates={rates} />
      </section>

      {/* 4. 상세 환율 테이블 섹션 */}
      <section className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px]">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800">
              상세 환율 정보
            </h2>
            <p className="text-xs font-bold text-slate-400">
              행을 클릭하면 해당 통화의 차트가 업데이트됩니다.
            </p>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
            Live Updates
          </span>
        </div>
        {/* [핵심 수정] onRowClick 시 selectedCurrency 상태 업데이트 */}
        <ExchangeRateTable
          rates={rates}
          selectedCurrency={selectedCurrency}
          onRowClick={(currency) => setSelectedCurrency(currency)}
        />
      </section>
    </main>
  );
};

export default LandingPage;
