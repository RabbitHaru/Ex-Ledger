import React, { useState, useEffect } from "react";
import axios from "axios";
import BaseLineChart from "../../pages/common/chart/BaseLineChart";

interface WeeklyRate {
  date: string;
  rate: number;
  [key: string]: string | number;
}

interface ExchangeRateChartProps {
  selectedCurrency: string; // 부모로부터 주입받은 값
}

const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({
  selectedCurrency,
}) => {
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8080/api/v1/exchange/history/${selectedCurrency}`,
          { params: { days: 14 } },
        );

        if (response.data && response.data.length > 0) {
          // 🌟 [핵심] 주말(토, 일) 데이터를 필터링하여 영업일만 남깁니다.
          const businessDayData = response.data.filter((item: any) => {
            const date = new Date(item.date);
            const day = date.getDay(); // 0: 일요일, 6: 토요일
            return day !== 0 && day !== 6;
          });

          // 필터링된 영업일 데이터 중 최신 14일(영업일 기준 약 3주)을 유지합니다.
          setWeeklyHistory(businessDayData.slice(-14));
        }
      } catch (error) {
        console.error(`❌ ${selectedCurrency} 데이터 호출 실패:`, error);
        setWeeklyHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, [selectedCurrency]);

  return (
    <div className="w-full h-full">
      <div className="flex items-center gap-3 px-2 mb-8">
        <span className="flex w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
        <h3 className="text-lg font-black tracking-tight text-gray-800">
          {selectedCurrency} 환율 트렌드{" "}
          <span className="ml-1 text-sm font-medium text-gray-400">
            (영업일 기준) {/* 시각적으로 영업일 전용임을 명시 */}
          </span>
        </h3>
      </div>

      <div className="w-full h-[calc(100%-4.5rem)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 border border-gray-100 bg-gray-50/50 rounded-3xl animate-pulse">
            {selectedCurrency} 데이터를 분석 중입니다...
          </div>
        ) : weeklyHistory.length >= 2 ? (
          <BaseLineChart
            data={weeklyHistory}
            dataKey="rate"
            xAxisKey="date"
            lineColor="#2563eb"
            unit="원"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 border-2 border-gray-100 border-dashed rounded-3xl">
            해당 통화의 데이터가 존재하지 않습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateChart;
