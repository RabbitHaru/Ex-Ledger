import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from "lucide-react";
import { getCurrencyName } from "../../../utils/formatter";
import type { ExchangeRate } from "../../../types/exchange";
import ExchangeRateHistoryModal from "./ExchangeRateHistoryModal";

interface ExchangeRateTableProps {
  rates: ExchangeRate[];
  selectedCurrency: string;
  onRowClick: (curUnit: string) => void;
}

const ExchangeRateTable: React.FC<ExchangeRateTableProps> = ({
  rates = [],
  selectedCurrency,
  onRowClick,
}) => {
  const navigate = useNavigate();
  const [historyTarget, setHistoryTarget] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<"all" | "up" | "down">("all");

  const processedRates = [...rates]
    .filter((r) =>
      (r.curUnit + (r.curNm || ""))
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortMode === "up") return (b.changeRate || 0) - (a.changeRate || 0);
      if (sortMode === "down") return (a.changeRate || 0) - (b.changeRate || 0);
      return a.curUnit.localeCompare(b.curUnit);
    });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 mb-6 md:flex-row">
        <div className="relative w-full md:w-80">
          <Search
            className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="통화 코드 또는 국가명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-100/50 border-none rounded-2xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex p-1 bg-slate-100/50 rounded-2xl">
          {(["all", "up", "down"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                sortMode === mode
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode === "all" ? "전체순" : mode === "up" ? "상승순" : "하락순"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-100 shadow-sm rounded-2xl">
        <table className="w-full text-[15px] text-left">
          <thead className="text-[12px] font-black text-slate-400 uppercase tracking-widest border-b bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-center">코드</th>
              <th className="px-6 py-4">국가/통화명</th>
              <th className="px-6 py-4 text-right">어제 환율</th>{" "}
              {/* 🌟 업데이트 대신 추가 */}
              <th className="px-6 py-4 font-black text-right text-slate-900">
                오늘 환율
              </th>{" "}
              {/* 🌟 이름 변경 및 강조 */}
              <th className="px-6 py-4 text-right">변동률</th>
              <th className="px-6 py-4 text-center">정산</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {processedRates.map((rate) => {
              const isSelected = selectedCurrency === rate.curUnit;
              const displayCode = rate.curUnit.split("(")[0];
              const cRate = rate.changeRate || 0;

              // 🌟 어제 환율 역산 로직: 어제 = 오늘 / (1 + 변동률/100)
              const yesterdayRate = rate.rate / (1 + cRate / 100);

              const formatVal = (val: number) =>
                val.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

              return (
                <tr
                  key={rate.curUnit}
                  onClick={() => {
                    onRowClick(rate.curUnit);
                    setHistoryTarget(rate.curUnit);
                  }}
                  className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/40 ${isSelected ? "bg-blue-50/60 ring-1 ring-inset ring-blue-100" : "bg-white"}`}
                >
                  <td className="px-6 py-6 font-black text-center text-slate-900">
                    {displayCode}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">
                        {rate.curNm || getCurrencyName(rate.curUnit)}
                      </span>
                      <span className="text-[11px] text-slate-300 font-bold uppercase">
                        KOREAEXIM SOURCE
                      </span>
                    </div>
                  </td>

                  {/* 🌟 어제 환율 표시 */}
                  <td className="px-6 py-6 font-medium text-right text-slate-400">
                    <span className="font-mono text-[16px]">
                      {formatVal(yesterdayRate)}
                    </span>
                  </td>

                  {/* 🌟 오늘 환율 표시 (기존보다 1px 크게 강조) */}
                  <td className="px-6 py-6 text-right">
                    <span className="font-mono text-[17px] font-black text-slate-900">
                      {formatVal(rate.rate)}
                    </span>
                  </td>

                  <td className="px-6 py-6 text-right">
                    <div
                      className={`flex items-center justify-end gap-1 font-black ${cRate > 0 ? "text-red-500" : cRate < 0 ? "text-blue-500" : "text-slate-400"}`}
                    >
                      {cRate > 0 ? (
                        <TrendingUp size={14} />
                      ) : cRate < 0 ? (
                        <TrendingDown size={14} />
                      ) : (
                        <Minus size={14} />
                      )}
                      <span className="font-mono">
                        {cRate > 0 ? "+" : ""}
                        {cRate.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  <td
                    className="px-6 py-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center">
                      <button
                        onClick={() =>
                          navigate("/seller/dashboard", {
                            state: { currencyCode: displayCode },
                          })
                        }
                        className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-xl text-[13px] font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95"
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
