import React, { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceDot,
} from "recharts";
import axios from "axios";

interface Props {
  rates?: any[];
  selectedCurrency?: string;
}

const ExchangeRateChart: React.FC<Props> = ({
  rates = [],
  selectedCurrency,
}) => {
  // 기본 통화를 USD로 설정하되, 부모에서 전달된 값이 있으면 우선시함
  const [chartCurrency, setChartCurrency] = useState(selectedCurrency || "USD");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 부모의 선택 통화가 변경되면 차트의 기준 통화도 동기화
  useEffect(() => {
    if (selectedCurrency) setChartCurrency(selectedCurrency);
  }, [selectedCurrency]);

  // 데이터 로직 강화: 현재 들어온 rates가 '리스트'인지 '차트용 이력'인지 판별
  useEffect(() => {
    // [핵심 수정] 단순히 rate만 있는 게 아니라 date 필드가 있어야 차트 데이터로 인정
    const isHistoricalData =
      rates.length > 0 && "rate" in rates[0] && "date" in rates[0];

    if (isHistoricalData) {
      setData(rates);
      setLoading(false);
    } else {
      // 리스트 데이터만 들어왔다면, 해당 통화의 14일치 이력을 서버에서 가져옴
      fetchHistory();
    }
  }, [rates, chartCurrency]);

  const fetchHistory = async () => {
    // 이미 이력 데이터 형태라면 API 중복 호출 방지
    const isHistoricalData =
      rates.length > 0 && "rate" in rates[0] && "date" in rates[0];
    if (isHistoricalData) return;

    setLoading(true);
    try {
      // 백엔드 API 경로 확인 필요 (v1 포함 여부)
      const res = await axios.get(
        `http://localhost:8080/api/v1/exchange/history/${chartCurrency}?days=14`,
      );
      if (res.data && Array.isArray(res.data)) {
        setData(res.data);
      }
    } catch (err) {
      console.error("차트 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  // 최고/최저점 계산
  const maxPoint =
    data.length > 0
      ? [...data].reduce((prev, cur) => (prev.rate > cur.rate ? prev : cur))
      : null;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
          <h3 className="text-lg font-black tracking-tighter text-slate-800">
            {chartCurrency} 환율 트렌드
          </h3>
        </div>

        {/* 히스토리 데이터가 직접 들어올 때는 드롭다운 숨김 */}
        {!(rates.length > 0 && "date" in rates[0]) && (
          <select
            value={chartCurrency}
            onChange={(e) => setChartCurrency(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border rounded-2xl text-xs font-black text-slate-700 outline-none"
          >
            {rates
              .filter((r) => r.curUnit)
              .map((r: any) => (
                <option key={r.curUnit} value={r.curUnit}>
                  {r.curUnit}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="relative flex-1 w-full p-4 bg-slate-50 rounded-2xl min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center w-full h-full font-bold text-slate-300 animate-pulse">
            데이터 수집 중...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full font-bold text-slate-300">
            표시할 데이터가 없습니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 50, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: 700, fill: "#cbd5e1" }}
              />
              <YAxis
                domain={["dataMin - 5", "dataMax + 5"]}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString()}
                tick={{ fontSize: 11, fontWeight: 700, fill: "#cbd5e1" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRate)"
                dot={{ r: 3, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
              />
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              {maxPoint && (
                <ReferenceDot
                  x={maxPoint.date}
                  y={maxPoint.rate}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={3}
                  label={{
                    position: "top",
                    value: `최고 ${maxPoint.rate.toLocaleString()}`,
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 900,
                    dy: -10,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ExchangeRateChart;
