import type { ExchangeRate } from "../../../types/exchange";
import React, { Suspense, lazy, useState, useEffect } from "react";
import CommonLayout from "../../layout/CommonLayout";
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
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    fetch("http://localhost:8080/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("데이터 로드 실패:", err));

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

  const sortedByChange = [...rates].sort(
    (a, b) => (b.changeRate || 0) - (a.changeRate || 0),
  );
  const topGainer = rates.length > 0 ? sortedByChange[0] : null;
  const topLoser =
    rates.length > 0 ? sortedByChange[sortedByChange.length - 1] : null;

  const gainerValue = topGainer?.changeRate || 0;
  const loserValue = topLoser?.changeRate || 0;

  return (
    <CommonLayout>
      <div className="sticky top-0 z-20 w-full border-b bg-slate-900 border-slate-800">
        <FXTicker rates={rates || []} />
      </div>
      <main className="flex flex-col min-h-screen gap-10 px-4 py-10 mx-auto max-w-7xl bg-slate-50/50">
        {/* Top Mover 카드 (지능형 라벨 적용) */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              label: gainerValue > 0 ? "최고 상승" : "최소 하락",
              data: topGainer,
              val: gainerValue,
            },
            {
              label: loserValue < 0 ? "최대 하락" : "최소 상승",
              data: topLoser,
              val: loserValue,
            },
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
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black ${mover.val > 0 ? "bg-red-50 text-red-500" : mover.val < 0 ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-400"}`}
              >
                {mover.val > 0 ? (
                  <ArrowUpRight size={20} />
                ) : mover.val < 0 ? (
                  <ArrowDownRight size={20} />
                ) : (
                  <Minus size={20} />
                )}
                <span className="text-lg">{mover.val.toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </section>

        <section className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px]">
          <h2 className="flex items-center gap-2 mb-8 text-xl font-black text-slate-800">
            <BarChart3 className="text-blue-600" size={20} /> 주요 통화 환율
            추이
          </h2>
          <div className="w-full h-96">
            <Suspense fallback={<ChartSkeleton />}>
              <ExchangeRateChart rates={rates || []} />
            </Suspense>
          </div>
        </section>

        <section className="flex flex-col w-full max-w-4xl p-2 mx-auto">
          <div className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px]">
            <MiniConverter rates={rates || []} />
          </div>
        </section>

        <section className="p-8 bg-white border border-slate-100 shadow-sm rounded-[32px]">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-800">
                상세 환율 정보
              </h2>
              <p className="text-xs font-bold text-slate-400">
                환율 정보를 클릭하여 상세 히스토리를 확인하세요.
              </p>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
              Live Updates
            </span>
          </div>
          <ExchangeRateTable
            rates={rates || []}
            selectedCurrency={selectedCurrency}
            onRowClick={setSelectedCurrency}
          />
        </section>
      </main>
    </CommonLayout>
  );
};

export default LandingPage;
