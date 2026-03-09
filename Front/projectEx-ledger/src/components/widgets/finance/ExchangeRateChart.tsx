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
import { ChevronDown, AlertCircle, RefreshCw } from "lucide-react";
import type { ExchangeRate } from "../../../types/exchange";

interface Props {
  rates?: ExchangeRate[];
  selectedCurrency?: string;
}

const ExchangeRateChart: React.FC<Props> = ({
  rates = [],
  selectedCurrency,
}) => {
  const [chartCurrency, setChartCurrency] = useState(selectedCurrency || "USD");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (selectedCurrency) setChartCurrency(selectedCurrency);
  }, [selectedCurrency]);

  const maxPoint =
    data.length > 0
      ? [...data].reduce((prev, cur) => (prev.rate > cur.rate ? prev : cur))
      : null;
  const minPoint =
    data.length > 0
      ? [...data].reduce((prev, cur) => (prev.rate < cur.rate ? prev : cur))
      : null;

  const fetchHistory = async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await axios.get(
        `http://localhost:8080/api/v1/exchange/history/${chartCurrency}?days=14`,
      );
      if (res.data && Array.isArray(res.data)) setData(res.data);
      else throw new Error("Invalid format");
    } catch (err) {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [chartCurrency]);

  return (
    <div className="flex flex-col w-full h-full">
      <style>
        {`
          .recharts-wrapper:focus, .recharts-surface:focus, .recharts-container:focus {
            outline: none !important; box-shadow: none !important;
          }
        `}
      </style>
      <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
          <h3 className="text-lg font-black text-slate-800">
            {chartCurrency} 환율 트렌드
            <span className="ml-2 text-xs font-bold text-slate-300">
              (최근 14 영업일)
            </span>
          </h3>
        </div>
        <select
          value={chartCurrency}
          onChange={(e) => setChartCurrency(e.target.value)}
          className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border rounded-2xl text-xs font-black text-slate-700 outline-none"
        >
          {rates.length > 0 ? (
            rates.map((rate) => (
              <option key={rate.curUnit} value={rate.curUnit}>
                {rate.curUnit} - {rate.curNm}
              </option>
            ))
          ) : (
            <option value={chartCurrency}>{chartCurrency}</option>
          )}
        </select>
      </div>

      <div className="relative flex-1 w-full p-4 bg-slate-50 rounded-2xl">
        <ResponsiveContainer width="100%" height="100%">
          {/* 🌟 수정: 상단 마진(top)을 40으로 늘려 라벨이 그려질 공간을 확보합니다 */}
          <AreaChart
            data={data}
            margin={{ top: 40, right: 20, left: 0, bottom: 0 }}
            style={{ outline: "none", border: "none" }}
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
              dy={10}
            />
            {/* 🌟 수정: Y축 도메인에 여유 계수(1.02)를 곱해 상단 공간을 강제로 만듭니다 */}
            <YAxis
              domain={["dataMin - 5", "dataMax + 15"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fontWeight: 700, fill: "#cbd5e1" }}
              tickFormatter={(val) => val.toLocaleString()}
            />
            <Tooltip contentStyle={{ borderRadius: "16px", border: "none" }} />

            <Area
              type="monotone"
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={3}
              fill="none"
              dot={{ r: 5, fill: "#2563eb", stroke: "#2563eb", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />

            {maxPoint && (
              <ReferenceDot
                x={maxPoint.date}
                y={maxPoint.rate}
                r={5}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  position: "top",
                  value: `최고 ${maxPoint.rate.toLocaleString()}`,
                  fill: "#ef4444",
                  fontSize: 11,
                  fontWeight: 900,
                  dy: -12, // 라벨을 점 위로 살짝 더 띄웁니다
                }}
              />
            )}
            {minPoint && (
              <ReferenceDot
                x={minPoint.date}
                y={minPoint.rate}
                r={5}
                fill="#2563eb"
                stroke="#fff"
                strokeWidth={2}
                label={{
                  position: "bottom",
                  value: `최저 ${minPoint.rate.toLocaleString()}`,
                  fill: "#2563eb",
                  fontSize: 11,
                  fontWeight: 900,
                  dy: 12,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExchangeRateChart;
