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
import type {
  ValueType,
  NameType,
  Formatter,
} from "recharts/types/component/DefaultTooltipContent";

interface ChartData {
  [key: string]: string | number;
}

interface BaseLineChartProps {
  data: ChartData[];
  dataKey: string;
  xAxisKey: string;
  lineColor?: string;
  unit?: string;
}

const BaseLineChart: React.FC<BaseLineChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  lineColor = "#3b82f6",
  unit = "",
}) => {
  const customFormatter: Formatter<ValueType, NameType> = (value) => {
    if (value === null || value === undefined) return ["0", ""];
    const numericValue =
      typeof value === "string" ? parseFloat(value) : (value as number);
    if (isNaN(numericValue)) return [value.toString(), ""];
    return [`${numericValue.toLocaleString()}${unit}`, ""];
  };

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            // 🌟 14일 데이터 가독성을 위해 간격 자동 조절
            interval="preserveStartEnd"
            minTickGap={10}
            dy={10}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: any) => value?.toLocaleString?.() || value}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
            formatter={customFormatter}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={3} // 선을 약간 더 두껍게
            dot={{ r: 3, fill: lineColor, strokeWidth: 2, stroke: "#fff" }} // 점 스타일 개선
            activeDot={{ r: 5, strokeWidth: 0 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BaseLineChart;
