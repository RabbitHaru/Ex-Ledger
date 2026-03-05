import type { ExchangeRate } from "../../../types/exchange";
import React, { Suspense, lazy, useState, useEffect } from "react";
import CommonLayout from "../../layout/CommonLayout";
import FXTicker from "../../widgets/finance/FXTicker";
import MiniConverter from "../../widgets/finance/MiniConverter"; // 🌟 복구
import ExchangeRateTable from "../../widgets/finance/ExchangeRateTable";

const ExchangeRateChart = lazy(
  () => import("../../widgets/finance/ExchangeRateChart"),
);

const ChartSkeleton = () => (
  <div className="w-full bg-gray-100 border border-gray-200 h-96 animate-pulse rounded-xl"></div>
);

const LandingPage: React.FC = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    // 실시간 최신 환율 로드
    fetch("http://localhost:8080/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(data))
      .catch((err) => console.error("데이터 로드 실패:", err));

    // SSE 연결
    const eventSource = new EventSource("http://localhost:8080/api/connect");
    eventSource.addEventListener("exchange-update", (event: any) => {
      setRates(JSON.parse(event.data));
    });

    return () => eventSource.close();
  }, []);

  return (
    <CommonLayout>
      <div className="sticky top-0 z-10 w-full border-b bg-slate-900 border-slate-800">
        <FXTicker rates={rates} />
      </div>

      <main className="flex flex-col min-h-screen gap-10 px-4 py-10 mx-auto max-w-7xl bg-gray-50">
        <section className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <h2 className="mb-6 text-xl font-bold text-gray-800">
            주요 통화 환율 추이
          </h2>
          <div className="w-full h-96">
            <Suspense fallback={<ChartSkeleton />}>
              <ExchangeRateChart selectedCurrency={selectedCurrency} />
            </Suspense>
          </div>
        </section>

        <section className="flex flex-col w-full max-w-4xl p-6 mx-auto bg-white border border-gray-200 shadow-sm rounded-xl">
          <MiniConverter rates={rates} />
        </section>

        <section className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <h2 className="mb-6 text-xl font-bold text-gray-800">
            상세 환율 정보
          </h2>
          <ExchangeRateTable
            rates={rates}
            selectedCurrency={selectedCurrency}
            onRowClick={setSelectedCurrency}
          />
        </section>
      </main>
    </CommonLayout>
  );
};

export default LandingPage;
