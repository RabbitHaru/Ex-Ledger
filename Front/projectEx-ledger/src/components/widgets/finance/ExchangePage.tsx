import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExchangeRateChart from "../../widgets/finance/ExchangeRateChart";
import { ArrowLeftRight, Building2, UserCircle, RefreshCcw, HandCoins } from "lucide-react";
import type { ExchangeRate } from "../../../types/exchange";
import { useWallet } from "../../../context/WalletContext";
import { useToast } from "../../notification/ToastProvider";
import { hasRole } from "../../../config/auth";
import ReceiptModal from "../../pages/remittance/ReceiptModal";

const ExchangePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [targetCurrency, setTargetCurrency] = useState<string>(location.state?.currencyCode || "USD");

  const {
    personalBalances,
    corporateBalances,
    hasCorporateAccount,
    exchangeCurrency,
  } = useWallet();

  const isIndividual = hasRole("ROLE_USER");
  const isCorpStaff = hasRole("ROLE_COMPANY_USER");
  const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [exchangeType, setExchangeType] = useState<"BUY" | "SELL">("BUY"); // BUY: 원화 -> 외화, SELL: 외화 -> 원화
  const [category, setCategory] = useState<"PERSONAL" | "BUSINESS">(!isIndividual && (isCorpStaff || isCorpAdmin) ? "BUSINESS" : "PERSONAL");
  const [amount, setAmount] = useState<number | "">(""); // 입력 금액
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("환율 로드 실패:", err));
  }, []);

  const currentRateObj = rates.find((r) => r.curUnit.includes(targetCurrency));
  const currentRate = currentRateObj?.rate || 0;

  // 잔액 정보
  const balances = category === "PERSONAL" ? personalBalances : corporateBalances;
  const krwBalance = balances?.KRW || 0;
  const foreignBalance = balances?.[targetCurrency] || 0;

  // 대상 환율 계산 (환전 수수료 1.5% 가정)
  const spread = 0.015;
  const appliedRate = exchangeType === "BUY" ? currentRate * (1 + spread) : currentRate * (1 - spread);

  // 예상 금액 계산
  const numAmount = Number(amount) || 0;
  const expectedAmount = exchangeType === "BUY" ? numAmount / appliedRate : numAmount * appliedRate;

  const handleExchange = async () => {
    try {
      setIsProcessing(true);
      const krwReq = exchangeType === "BUY" ? numAmount : expectedAmount;
      const forgReq = exchangeType === "BUY" ? expectedAmount : numAmount;

      await exchangeCurrency(category, targetCurrency, exchangeType, krwReq, forgReq);
      
      setReceiptData({
          txId: `EX-${Date.now()}`,
          sender: localStorage.getItem("user_real_name") || "사용자",
          recipient: category === "PERSONAL" ? "본인 외화 지갑" : "기업 외화 지갑",
          recipientAcc: category === "PERSONAL" ? "개인 계좌" : "기업 계좌",
          amount: exchangeType === "BUY" ? forgReq : krwReq,
          currency: exchangeType === "BUY" ? targetCurrency : "KRW",
          totalKrw: exchangeType === "BUY" ? krwReq : forgReq,
          fee: 0,
          date: new Date().toLocaleString(),
          category: category
      });
      setIsReceiptOpen(true);

      showToast("성공적으로 환전되었습니다.", "SUCCESS");
      setAmount("");
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
    <div className="w-full p-6 mx-auto lg:p-10 max-w-7xl">
      <div className="mb-10">
        <h1 className="text-3xl italic font-black text-slate-900">
          실시간 환전 신청
        </h1>
        <p className="mt-2 font-medium text-slate-500">
          원화(KRW)와 외화를 실시간 환율로 안전하게 환전하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* 환전 대상 선택 등 (옵션) */}
          <div className="flex flex-wrap gap-4">
            <button
               onClick={() => isIndividual && setCategory("PERSONAL")}
               className={`flex-1 flex gap-3 items-center justify-center py-4 rounded-2xl font-black transition-all border-2 ${category === "PERSONAL" ? "border-teal-500 bg-teal-50 text-teal-700 shadow-sm" : "border-slate-100 bg-white text-slate-500"} ${!isIndividual && "opacity-40 cursor-not-allowed"}`}
            >
               <UserCircle size={20} /> 개인 지갑 {category === "PERSONAL" && "(활성)"}
            </button>
            {hasCorporateAccount && (
              <button
                 onClick={() => (isCorpStaff || isCorpAdmin) && setCategory("BUSINESS")}
                 className={`flex-1 flex gap-3 items-center justify-center py-4 rounded-2xl font-black transition-all border-2 ${category === "BUSINESS" ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-100 bg-white text-slate-500"} ${!(isCorpStaff || isCorpAdmin) && "opacity-40 cursor-not-allowed"}`}
              >
                 <Building2 size={20} /> 기업 지갑 {category === "BUSINESS" && "(활성)"}
              </button>
            )}
          </div>

          {/* 차트 위젯 */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 h-[450px] shadow-sm">
            <ExchangeRateChart
              rates={rates}
              selectedCurrency={targetCurrency}
            />
          </div>
        </div>

        {/* 환전 계산기 */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-8 opacity-60">
              <RefreshCcw size={20} className="text-teal-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                Currency Exchange
              </span>
            </div>

            {/* 구매 / 판매 토글 및 통화 선택 */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">대상 통화</span>
                  <select
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                    className="bg-transparent text-white font-black text-lg outline-none cursor-pointer"
                 >
                    <option value="USD" className="bg-slate-800 text-white">🇺🇸 USD (미국 달러)</option>
                    <option value="EUR" className="bg-slate-800 text-white">🇪🇺 EUR (유로)</option>
                    <option value="JPY" className="bg-slate-800 text-white">🇯🇵 JPY (일본 엔)</option>
                    <option value="GBP" className="bg-slate-800 text-white">🇬🇧 GBP (영국 파운드)</option>
                    <option value="CAD" className="bg-slate-800 text-white">🇨🇦 CAD (캐나다 달러)</option>
                    <option value="AUD" className="bg-slate-800 text-white">🇦🇺 AUD (호주 달러)</option>
                    <option value="CNH" className="bg-slate-800 text-white">🇨🇳 CNH (위안화)</option>
                    <option value="HKD" className="bg-slate-800 text-white">🇭🇰 HKD (홍콩 달러)</option>
                    <option value="SGD" className="bg-slate-800 text-white">🇸🇬 SGD (싱가포르 달러)</option>
                    <option value="CHF" className="bg-slate-800 text-white">🇨🇭 CHF (스위스 프랑)</option>
                 </select>
              </div>

              <div className="flex p-1 bg-white/10 rounded-2xl">
                  <button
                      onClick={() => { setExchangeType("BUY"); setAmount(""); }}
                      className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${exchangeType === "BUY" ? "bg-white text-slate-900 shadow" : "text-white hover:bg-white/5"}`}
                  >
                      외화 사기
                  </button>
                  <button
                      onClick={() => { setExchangeType("SELL"); setAmount(""); }}
                      className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${exchangeType === "SELL" ? "bg-white text-slate-900 shadow" : "text-white hover:bg-white/5"}`}
                  >
                      외화 팔기
                  </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="block mb-2 text-xs font-bold text-slate-400">보유 잔액</span>
                <div className="flex justify-between p-4 rounded-xl bg-white/5 font-mono">
                    <span>{krwBalance.toLocaleString()} KRW</span>
                    <span className="text-teal-400">{foreignBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {targetCurrency}</span>
                </div>
              </div>

              <div>
                <span className="block mb-2 text-xs font-bold text-slate-400">
                    {exchangeType === "BUY" ? "사용할 원화(KRW) 금액" : `판매할 외화(${targetCurrency}) 금액`}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-6 py-5 pr-20 text-2xl font-black border outline-none bg-white/5 border-white/10 rounded-2xl"
                    placeholder="0"
                  />
                  <span className="absolute text-lg font-black -translate-y-1/2 right-6 top-1/2 text-slate-500">
                    {exchangeType === "BUY" ? "KRW" : targetCurrency}
                  </span>
                </div>
              </div>

              <div className="pt-6 space-y-4 border-t border-white/5">
                <div className="flex justify-between text-sm font-medium text-slate-400">
                  <span>적용 환율</span>
                  <span className="font-mono text-white">
                    {appliedRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} 원/{targetCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-black text-teal-400">
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
                  className="w-full py-5 font-black transition-all bg-teal-500 hover:bg-teal-600 rounded-2xl disabled:opacity-20 flex justify-center items-center gap-2 mt-4"
                >
                  <HandCoins size={20} />
                  {isProcessing ? "처리 중..." : "인증 후 환전 진행하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 환전 영수증 모달 */}
      {isReceiptOpen && receiptData && (
          <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} data={receiptData} />
      )}
    </div>
  );
};

export default ExchangePage;
