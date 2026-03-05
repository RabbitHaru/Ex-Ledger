import React, { useState, useEffect } from "react";
import axios from "axios";
import BaseLineChart from "../../pages/common/chart/BaseLineChart";

interface WeeklyRate {
  date: string;
  rate: number;
  updatedAt: string; // 🌟 요일 판별을 위해 추가
  [key: string]: string | number;
}

interface ExchangeRateChartProps {
  selectedCurrency: string;
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
        // 14개 영업일 확보를 위해 30일치 요청
        const response = await axios.get(
          `http://localhost:8080/api/v1/exchange/history/${selectedCurrency}`,
          { params: { days: 30 } },
        );

        if (response.data && response.data.length > 0) {
          // 🌟 [핵심 수정] 연도가 포함된 updatedAt 필드로 정확한 요일을 계산합니다.
          const businessDayData = response.data.filter((item: any) => {
            const date = new Date(item.updatedAt);
            const day = date.getDay(); // 0: 일요일, 6: 토요일

            // 이제 2026년 기준 화(2), 수(3)요일을 주말로 오해하지 않습니다.
            return day !== 0 && day !== 6;
          });

          // 중복 제거 후 최신 14개만 선택
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
            (최근 14 영업일)
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
          <div className="flex items-center justify-center h-full px-4 text-sm text-center text-gray-400 border-2 border-gray-100 border-dashed rounded-3xl">
            데이터 수집 중입니다. <br /> (영업일 기준 데이터가 쌓이면 그래프가
            표시됩니다)
          </div>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateChart;
