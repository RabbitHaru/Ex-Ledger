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

// 'type' 키워드를 추가하여 형식 전용 가져오기임을 명시합니다.
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
  // 툴팁 포맷터 로직 (이전과 동일하지만 타입 안정성은 유지됨)
  const customFormatter: Formatter<ValueType, NameType> = (value) => {
    if (value === null || value === undefined) return ["0", ""];

    const numericValue =
      typeof value === "string" ? parseFloat(value) : (value as number);

    if (isNaN(numericValue)) return [value.toString(), ""];

    return [`${numericValue.toLocaleString()}${unit}`, ""];
  };

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            hide={false}
            domain={["auto", "auto"]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: any) => value?.toLocaleString?.() || value}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={customFormatter}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 4, fill: lineColor }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BaseLineChart;
