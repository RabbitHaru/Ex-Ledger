import React, { useState, useEffect } from "react";
import axios from "axios";
import BaseLineChart from "../../pages/common/chart/BaseLineChart";

/**
 * WeeklyRate 인터페이스:
 * - date: X축 날짜 (백엔드 DTO에서 "MM-dd" 형식으로 내려줌)
 * - rate: Y축 환율 값
 * - [key: string]: BaseLineChart와 호환되기 위한 인덱스 시그니처
 */
interface WeeklyRate {
  date: string;
  rate: number;
  [key: string]: string | number;
}

const ExchangeRateChart: React.FC = () => {
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        setLoading(true);
        console.log("=== [DEBUG] 환율 데이터 요청 시작 ===");

        /**
         * 🌟 [백엔드 연동]
         * - 컨트롤러 포트 8080 사용
         * - 리액트 포트 5173에 대한 CORS 허용 확인 필요
         */
        const response = await axios.get(
          "http://localhost:8080/api/v1/exchange/history/USD",
          {
            params: { days: 7 },
          },
        );

        // 🌟 [DEBUG] 서버에서 받은 순수 데이터를 출력합니다.
        console.log("1. 서버 응답 원본 (Raw Response):", response);
        console.log("2. 수신된 데이터 배열 (Data Body):", response.data);

        if (response.data && response.data.length > 0) {
          // 🌟 [DEBUG] 하얀 화면 방지를 위해 date가 null인 데이터가 있는지 체크합니다.
          const nullDateCheck = response.data.filter(
            (item: any) => item.date === null,
          );
          if (nullDateCheck.length > 0) {
            console.warn(
              "⚠️ 경고: date 필드가 null인 데이터가 발견되었습니다!",
              nullDateCheck,
            );
          }

          // 유효한 데이터만 필터링 (date가 있고 rate가 숫자인 데이터)
          const validData = response.data.filter(
            (item: any) => item.date !== null && item.rate !== null,
          );

          console.log("3. 필터링 후 최종 차트 데이터 (Valid Data):", validData);
          setWeeklyHistory(validData);
        } else {
          console.warn(
            "⚠️ 경고: 서버로부터 빈 배열([])이 반환되었습니다. DB를 확인하세요.",
          );
        }
      } catch (error) {
        // 🌟 [DEBUG] 에러 발생 시 상세 내용을 출력합니다.
        console.error("❌ [DEBUG] API 호출 중 에러 발생:", error);
        if (axios.isAxiosError(error)) {
          console.error("상세 메시지:", error.message);
          console.error("상태 코드:", error.response?.status);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  // 1. 로딩 화면
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-50 rounded-xl animate-pulse">
        <div className="text-center">
          <div className="inline-block w-8 h-8 mb-2 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-sm font-medium text-gray-400">
            DB 환율 데이터 분석 중...
          </p>
        </div>
      </div>
    );
  }

  // 2. 데이터 부족 또는 부재 시 화면 (하얀 화면 방지)
  if (weeklyHistory.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center border-2 border-gray-200 border-dashed bg-gray-50 rounded-xl">
        <svg
          className="w-12 h-12 mb-3 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm font-semibold text-gray-600">
          조회된 환율 이력이 부족합니다.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          최소 2개의 데이터가 필요합니다. (현재: {weeklyHistory.length}개)
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1 mt-4 text-xs text-gray-500 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50"
        >
          새로고침 시도
        </button>
      </div>
    );
  }

  // 3. 정상 렌더링
  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
          <span className="text-xs font-bold text-gray-700">
            실시간 데이터 연동 중
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
            LIVE DB: USD/KRW
          </span>
        </div>
      </div>

      <div className="w-full h-[calc(100%-3rem)]">
        <BaseLineChart
          data={weeklyHistory}
          dataKey="rate" // DTO 필드명
          xAxisKey="date" // DTO 필드명
          lineColor="#2563eb"
          unit="원"
        />
      </div>
    </div>
  );
};

export default ExchangeRateChart;
