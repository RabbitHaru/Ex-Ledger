import React from "react";
import { formatCurrency, getCurrencyName } from "../../../utils/formatter";
import type { ExchangeRate } from "../../../types/exchange";

interface ExchangeRateTableProps {
  rates: ExchangeRate[];
  selectedCurrency: string;
  onRowClick: (curUnit: string) => void;
}

const ExchangeRateTable: React.FC<ExchangeRateTableProps> = ({
  rates,
  selectedCurrency,
  onRowClick,
}) => {
  // 🌟 [추가] 통화 코드 순으로 정렬하여 26개 데이터를 찾기 쉽게 만듭니다.
  const sortedRates = [...rates].sort((a, b) =>
    a.curUnit.localeCompare(b.curUnit),
  );

  return (
    <div className="overflow-x-auto bg-white border border-gray-100 shadow-sm rounded-2xl">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase border-b bg-gray-50/80">
          <tr>
            <th className="w-24 px-6 py-4 text-center">코드</th>
            <th className="px-6 py-4">국가/통화명</th>
            <th className="px-6 py-4 text-right">현재 환율</th>
            <th className="px-6 py-4 text-center">업데이트 (KST)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sortedRates.map((rate) => {
            const isSelected = selectedCurrency === rate.curUnit;

            return (
              <tr
                key={rate.curUnit}
                onClick={() => onRowClick(rate.curUnit)}
                className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/40 ${
                  isSelected
                    ? "bg-blue-50/80 ring-1 ring-inset ring-blue-100"
                    : "bg-white"
                }`}
              >
                <td className="px-6 py-4 font-black text-center text-gray-900">
                  {rate.curUnit.split("(")[0]}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">
                      {rate.curNm || getCurrencyName(rate.curUnit)}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {rate.provider} Source
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`font-mono font-bold text-base ${isSelected ? "text-blue-700" : "text-blue-600"}`}
                  >
                    {formatCurrency(rate.rate, rate.curUnit)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-md">
                    {rate.updatedAt.split(" ")[1]}{" "}
                    {/* 시간만 표시하여 간결하게 */}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ExchangeRateTable;
