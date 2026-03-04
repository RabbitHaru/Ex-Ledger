import React, { useState, useEffect } from "react";
import axios from "axios";
import BaseLineChart from "../../pages/common/chart/BaseLineChart";
import type { ExchangeRate } from "../../../types/exchange";

interface ExchangeRateChartProps {
  rates: ExchangeRate[];
}

interface WeeklyRate {
  date: string;
  rate: number;
  [key: string]: string | number;
}

const ExchangeRateChart: React.FC<ExchangeRateChartProps> = ({ rates }) => {
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        setLoading(true);
        // 🌟 1. 요청 기간을 7일에서 14일로 확장
        const response = await axios.get(
          "http://localhost:8080/api/v1/exchange/history/USD",
          { params: { days: 14 } },
        );

        if (response.data && response.data.length > 0) {
          // 2. null 체크 및 데이터 정제
          const validData = response.data.filter(
            (item: any) => item.date !== null && item.rate !== null,
          );

          // 🌟 3. 데이터 자르기 (14일 초과 데이터 삭제)
          // 날짜 기준 오름차순(과거->현재)일 경우 .slice(-14)를 통해 최신 14일만 남깁니다.
          const processedData = validData.slice(-14);

          setWeeklyHistory(processedData);
        }
      } catch (error) {
        console.error("❌ [DEBUG] 차트 데이터 호출 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50 animate-pulse rounded-xl">
        14일간의 추이 분석 중...
      </div>
    );

  if (weeklyHistory.length < 2)
    return (
      <div className="flex items-center justify-center h-full p-6 text-center border-2 border-dashed rounded-xl">
        데이터 부족 ({weeklyHistory.length}일치)
      </div>
    );

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between px-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
          <span className="text-xs font-bold text-gray-700">
            최근 14일 환율 트렌드
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">
          * 14일 초과 데이터 자동 제외
        </span>
      </div>
      <div className="w-full h-[calc(100%-3.5rem)]">
        <BaseLineChart
          data={weeklyHistory}
          dataKey="rate"
          xAxisKey="date"
          lineColor="#2563eb"
          unit="원"
        />
      </div>
    </div>
  );
};

export default ExchangeRateChart;
