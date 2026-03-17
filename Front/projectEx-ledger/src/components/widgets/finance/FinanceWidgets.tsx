import type { ExchangeRate } from "../../../types/exchange";
import React, { useState, useEffect } from "react";
import FXTicker from "./FXTicker";

const FinanceWidgets: React.FC = () => {
  // 1. 타입을 명시하여 빈 배열([]) 참조 에러 방지
  const [rates, setRates] = useState<ExchangeRate[]>([]);

  useEffect(() => {
    // 2. 초기 데이터 로드 (REST API)
    fetch("/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(data))
      .catch((err) => console.error("초기 데이터 로딩 실패:", err));

    // 3. SSE 연결 관리 (시니어의 핵심 가이드)
    // FXTicker에 있던 SSE 로직을 부모로 옮겨와 전체 위젯이 실시간으로 동기화되게 합니다.
    const eventSource = new EventSource("/api/connect");

    eventSource.addEventListener("exchange-update", (event: any) => {
      const updatedRates = JSON.parse(event.data);
      setRates(updatedRates); // 환율이 바뀌면 계산기와 전광판이 동시에 업데이트됩니다.
    });

    return () => eventSource.close(); // 컴포넌트 언마운트 시 연결 종료
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 lg:flex-row">
      {/* 4. 데이터 로딩 전 예외 처리 (UI 방어 코드) */}
      {rates.length > 0 ? (
        <>

          <div className="lg:w-2/3">
            <FXTicker rates={rates} />
          </div>
        </>
      ) : (
        <div className="w-full py-10 text-center text-gray-400">
          최신 환율 정보를 수신 중입니다...
        </div>
      )}
    </div>
  );
};

export default FinanceWidgets;
