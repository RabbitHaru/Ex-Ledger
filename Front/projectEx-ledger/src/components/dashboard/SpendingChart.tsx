import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; amount: number }[]; // 백엔드 DailySpending 규격
}

const SpendingChart = ({ data }: Props) => {
  return (
    <div className="w-full h-[300px] bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="mb-4 text-lg font-bold text-gray-800">
        최근 지출 추이 (KRW)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            // 날짜 포맷 (YYYY-MM-DD -> MM/DD)
            tickFormatter={(str) =>
              str ? str.split("-").slice(1).join("/") : ""
            }
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            // value를 any로 받고, 내부에서 숫자 변환 및 null 체크를 수행합니다.
            formatter={(value: any) => {
              // 값이 없거나 undefined일 경우 0으로 취급
              const numericValue = value ? Number(value) : 0;

              return [`${numericValue.toLocaleString()}원`, "지출"];
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingChart;
