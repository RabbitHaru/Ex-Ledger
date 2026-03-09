import React, { useState, useEffect } from "react";
import { formatCurrency, getCurrencyName } from "../../../utils/formatter";
import type { ExchangeRate } from "../../../types/exchange";

interface MiniConverterProps {
  rates: ExchangeRate[];
}

const MiniConverter: React.FC<MiniConverterProps> = ({ rates }) => {
  // 기본 선택값을 USD로 설정하되, 데이터가 로드되면 첫 번째 항목으로 유연하게 대응합니다.
  const [selectedUnit, setSelectedUnit] = useState<string>("USD");
  const [amount, setAmount] = useState<number>(0);
  const [result, setResult] = useState<number>(0);

  useEffect(() => {
    const currentRate = rates.find((r) => r.curUnit === selectedUnit);

    if (currentRate) {
      let rateValue = currentRate.rate;

      // 🌟 [핵심 보정] DB에 100단위(예: 900.50)로 저장된 경우, 계산 시 1단위로 변환합니다.
      // JPY(100), IDR(100) 등 문자열 포함 여부로 판별합니다.
      if (
        selectedUnit.includes("(100)") ||
        selectedUnit === "JPY" ||
        selectedUnit === "IDR"
      ) {
        rateValue = rateValue / 100;
      }

      setResult(amount * rateValue);
    }
  }, [amount, selectedUnit, rates]);

  return (
    <div className="p-8 bg-white border border-gray-100 shadow-xl rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
        <h3 className="text-xl font-bold text-gray-800">실시간 환전 계산기</h3>
      </div>

      <div className="space-y-6">
        {/* 입력 영역 */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 group">
            <label className="block mb-2 ml-1 text-xs font-semibold text-gray-400 uppercase">
              외화 선택
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full p-3 text-sm font-bold transition-all border-2 outline-none appearance-none cursor-pointer border-gray-50 rounded-xl bg-gray-50 focus:border-blue-500 focus:bg-white"
            >
              {rates.map((r) => (
                <option key={r.curUnit} value={r.curUnit}>
                  {r.curUnit.split("(")[0]} - {getCurrencyName(r.curUnit)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-[1.5] group">
            <label className="block mb-2 ml-1 text-xs font-semibold text-gray-400 uppercase">
              금액 입력
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-3 font-mono text-lg font-bold text-right transition-all border-2 outline-none border-gray-50 rounded-xl bg-gray-50 focus:border-blue-500 focus:bg-white"
                placeholder="0.00"
              />
              <span className="absolute text-sm font-bold text-gray-400 -translate-y-1/2 left-3 top-1/2">
                {selectedUnit.split("(")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* 결과 영역 */}
        <div className="pt-6 border-t-2 border-dashed border-gray-50">
          <div className="flex flex-col items-end">
            <span className="mb-1 text-xs font-bold text-gray-400">
              예상 수령 금액 (KRW)
            </span>
            <div className="text-3xl font-black tracking-tight text-blue-700">
              {formatCurrency(result, "KRW")}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 mt-6 rounded-lg bg-blue-50/50">
            <span className="text-[10px] text-blue-400 font-medium">
              * 한국수출입은행 매매기준율 기준
            </span>
            <span className="text-[10px] text-gray-400 italic">
              실거래 시 환전 수수료가 발생할 수 있습니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniConverter;
