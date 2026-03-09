import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator } from "lucide-react"; // 상세보기 아이콘은 제거하고 정산 아이콘만 유지
import { formatCurrency, getCurrencyName } from "../../../utils/formatter";
import type { ExchangeRate } from "../../../types/exchange";
import ExchangeRateHistoryModal from "./ExchangeRateHistoryModal";

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
  const navigate = useNavigate();
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);

  const sortedRates = [...rates].sort((a, b) =>
    a.curUnit.localeCompare(b.curUnit),
  );

  return (
    <div className="w-full">
      <div className="overflow-x-auto bg-white border border-gray-100 shadow-sm rounded-2xl">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-center">코드</th>
              <th className="px-6 py-4">국가/통화명</th>
              <th className="px-6 py-4 text-right">현재 환율</th>
              <th className="px-6 py-4 text-center">업데이트 (KST)</th>
              <th className="px-6 py-4 text-center">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedRates.map((rate) => {
              const isSelected = selectedCurrency === rate.curUnit;

              return (
                <tr
                  key={rate.curUnit}
                  onClick={() => onRowClick(rate.curUnit)}
                  className={`group cursor-pointer transition-all duration-150 hover:bg-slate-50/80 ${
                    isSelected ? "bg-blue-50/50" : "bg-white"
                  }`}
                >
                  <td className="px-6 py-6 font-black text-center text-gray-900">
                    {rate.curUnit.split("(")[0]}
                  </td>

                  {/* 🌟 수정 1: 국가/통화명 클릭 시 상세보기 팝업 트리거 */}
                  <td className="px-6 py-6">
                    <div className="flex flex-col items-start">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 행 클릭 이벤트(차트 변경) 전파 방지
                          setHistoryTarget(rate.curUnit);
                        }}
                        className="font-bold transition-colors text-slate-800 hover:text-blue-600 hover:underline decoration-2 underline-offset-4"
                      >
                        {rate.curNm || getCurrencyName(rate.curUnit)}
                      </button>
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">
                        KOREAEXIM SOURCE
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-6 text-right">
                    <span className="font-mono text-base font-black text-blue-600">
                      {formatCurrency(rate.rate, rate.curUnit)}{" "}
                      <small className="text-[10px] ml-0.5 text-blue-400">
                        {rate.curUnit.split("(")[0]}
                      </small>
                    </span>
                  </td>

                  <td className="px-6 py-6 text-center">
                    <span className="text-[10px] text-slate-400 font-black bg-slate-50 px-2.5 py-1 rounded-lg tracking-widest">
                      {rate.updatedAt.split(" ")[1]}
                    </span>
                  </td>

                  {/* 🌟 수정 2: '정산' 버튼만 남기고 텍스트 간소화 */}
                  <td
                    className="px-6 py-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate("/seller/dashboard")}
                        className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                      >
                        <Calculator size={14} /> 정산
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ExchangeRateHistoryModal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        currencyCode={historyTarget || ""}
      />
    </div>
  );
};

export default ExchangeRateTable;
