import React, { useState, useEffect } from "react";
import { HandCoins, X } from "lucide-react";
import { useWallet } from "../../../context/WalletContext";
import { useToast } from "../../notification/ToastProvider";
import { hasRole } from "../../../config/auth";
import type { ExchangeRate } from "../../../types/exchange";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rates: ExchangeRate[];
  initialCurrency: string;
}

const SmartExchangeModal: React.FC<Props> = ({ isOpen, onClose, rates, initialCurrency }) => {
  const { showToast } = useToast();
  const [targetCurrency, setTargetCurrency] = useState<string>(initialCurrency || "USD");

  const {
    personalBalances,
    corporateBalances,
    hasCorporateAccount,
    exchangeCurrency,
  } = useWallet();

  const isIndividual = hasRole("ROLE_USER");
  const isCorpStaff = hasRole("ROLE_COMPANY_USER");
  const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");

  const [exchangeType, setExchangeType] = useState<"BUY" | "SELL">("BUY");
  const [category] = useState<"PERSONAL" | "BUSINESS">(!isIndividual && (isCorpStaff || isCorpAdmin) ? "BUSINESS" : "PERSONAL");
  const [amount, setAmount] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && initialCurrency) {
      setTargetCurrency(initialCurrency);
    }
  }, [isOpen, initialCurrency]);

  if (!isOpen) return null;

  const currentRateObj = rates.find((r) => r.curUnit.includes(targetCurrency));
  const currentRate = currentRateObj?.rate || 0;

  const balances = category === "PERSONAL" ? personalBalances : corporateBalances;
  const krwBalance = balances?.KRW || 0;
  const foreignBalance = balances?.[targetCurrency] || 0;

  const spread = 0.015;
  const appliedRate = exchangeType === "BUY" ? currentRate * (1 + spread) : currentRate * (1 - spread);

  const numAmount = Number(amount) || 0;
  const expectedAmount = exchangeType === "BUY" ? numAmount / appliedRate : numAmount * appliedRate;

  const handleExchange = async () => {
    try {
      setIsProcessing(true);
      const krwReq = exchangeType === "BUY" ? numAmount : expectedAmount;
      const forgReq = exchangeType === "BUY" ? expectedAmount : numAmount;

      await exchangeCurrency(category, targetCurrency, exchangeType, krwReq, forgReq);
      
      showToast("성공적으로 환전되었습니다.", "SUCCESS");
      setAmount("");
      onClose(); // 성공 후 모달 닫기
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data || "환전 처리 중 오류가 발생했습니다.", "ERROR");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCertificationAndExchange = () => {
    if (numAmount <= 0) return;
    if (exchangeType === "BUY" && numAmount > krwBalance) {
      showToast("원화 잔액이 부족합니다.", "ERROR");
      return;
    }
    if (exchangeType === "SELL" && numAmount > foreignBalance) {
      showToast(`${targetCurrency} 잔액이 부족합니다.`, "ERROR");
      return;
    }

    const { IMP } = window as any;
    if (!IMP) {
      handleExchange();
      return;
    }
    
    IMP.init(import.meta.env.VITE_PORTONE_STORE_ID || "imp66377884");

    IMP.certification({
      merchant_uid: `cert-exch-${Date.now()}`,
      popup: true
    }, (rsp: any) => {
      if (rsp.success) {
        showToast("본인인증 완료, 환전을 진행합니다.", "SUCCESS");
        handleExchange();
      } else {
        showToast(`인증 실패: ${rsp.error_msg}`, "ERROR");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute p-2 text-slate-400 transition-colors top-6 right-6 hover:text-slate-800 rounded-xl hover:bg-slate-100"
        >
          <X size={24} />
        </button>

        <h2 className="mb-8 text-2xl font-black text-slate-900">💰 퀵 스마트 환전</h2>

        <div className="flex flex-col gap-4 mb-8">
           <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 w-full overflow-hidden transition-all hover:bg-slate-100">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-4">대상 통화</span>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="bg-transparent text-slate-900 font-black text-xl outline-none cursor-pointer text-right w-full min-w-[50%] truncate"
             >
                {rates.map((rate) => {
                   const code = rate.curUnit;
                   const flagMap: Record<string, string> = {
                     USD: "🇺🇸", EUR: "🇪🇺", JPY: "🇯🇵", "JPY(100)": "🇯🇵", GBP: "🇬🇧",
                     CAD: "🇨🇦", AUD: "🇦🇺", CNH: "🇨🇳", HKD: "🇭🇰", SGD: "🇸🇬",
                     CHF: "🇨🇭", NZD: "🇳🇿", THB: "🇹🇭", SEK: "🇸🇪", DKK: "🇩🇰",
                     NOK: "🇳🇴", SAR: "🇸🇦", KWD: "🇰🇼", BHD: "🇧🇭", AED: "🇦🇪",
                     MYR: "🇲🇾", IDR: "🇮🇩", "IDR(100)": "🇮🇩", TWD: "🇹🇼", PHP: "🇵🇭",
                     BND: "🇧🇳"
                   };
                   const flag = flagMap[code] || "🌐";
                   return (
                       <option key={code} value={code} className="bg-white text-slate-900">
                           {flag} {code} ({rate.curNm})
                       </option>
                   );
                })}
             </select>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button
                  onClick={() => { setExchangeType("BUY"); setAmount(""); }}
                  className={`flex-1 py-4 text-[15px] font-black rounded-xl transition-all ${exchangeType === "BUY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50"}`}
              >
                  외화 사기
              </button>
              <button
                  onClick={() => { setExchangeType("SELL"); setAmount(""); }}
                  className={`flex-1 py-4 text-[15px] font-black rounded-xl transition-all ${exchangeType === "SELL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50"}`}
              >
                  외화 팔기
              </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <span className="block mb-2 text-sm font-bold text-slate-500">보유 잔액</span>
            <div className="flex justify-between p-4 rounded-xl bg-slate-50 font-mono text-lg text-slate-700">
                <span>{krwBalance.toLocaleString()} KRW</span>
                <span className="text-indigo-600">{foreignBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {targetCurrency}</span>
            </div>
          </div>

          <div>
            <span className="block mb-2 text-sm font-bold text-slate-500">
                {exchangeType === "BUY" ? "사용할 원화(KRW) 금액" : `판매할 외화(${targetCurrency}) 금액`}
            </span>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-6 py-6 pr-20 text-3xl font-black text-slate-900 border outline-none bg-white border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder="0"
              />
              <span className="absolute text-lg font-black -translate-y-1/2 right-6 top-1/2 text-slate-400">
                {exchangeType === "BUY" ? "KRW" : targetCurrency}
              </span>
            </div>
          </div>

          <div className="pt-6 space-y-4 border-t border-slate-100">
            <div className="flex justify-between text-base font-medium text-slate-500">
              <span>적용 환율</span>
              <span className="font-mono text-slate-800">
                {appliedRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} KRW / {targetCurrency}
              </span>
            </div>
            {/* 수수료 명시 영역 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-xs whitespace-nowrap font-black bg-indigo-100 text-indigo-600 rounded-lg">수수료 1.5%</span>
                <span className="text-xs font-medium text-slate-500 break-keep">환전 수수료가 포함된 환율입니다.</span>
              </div>
              <span className="font-mono text-sm sm:text-xs whitespace-nowrap text-slate-600 font-black self-end sm:self-auto">
                {exchangeType === "BUY" ? "+" : "-"}{(currentRate * spread).toLocaleString(undefined, { maximumFractionDigits: 2 })} KRW
              </span>
            </div>
            <div className="flex justify-between text-xl font-black text-indigo-600">
              <span>예상 수령액</span>
              <span className="font-mono">
                {exchangeType === "BUY" 
                  ? `${expectedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ` + targetCurrency
                  : `${Math.floor(expectedAmount).toLocaleString()} KRW`
                }
              </span>
            </div>
            <button
              onClick={handleCertificationAndExchange}
              disabled={isProcessing || numAmount <= 0 || (exchangeType === "BUY" ? numAmount > krwBalance : numAmount > foreignBalance)}
              className="w-full py-6 text-lg font-black transition-all bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl disabled:opacity-30 disabled:hover:bg-indigo-600 flex justify-center items-center gap-2 mt-4 shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 active:translate-y-0"
            >
              <HandCoins size={20} />
              {isProcessing ? "처리 중..." : "인증 후 환전 진행하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartExchangeModal;
