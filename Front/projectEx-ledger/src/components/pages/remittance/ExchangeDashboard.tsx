import React, { useState, useEffect } from "react";
import CommonLayout from "../../layout/CommonLayout";
import { useToast } from "../../notification/ToastProvider";
import { hasRole } from "../../../utils/auth";
import {
  Building2,
  Send,
  Wallet,
  CheckCircle2,
  X,
  Loader2,
  PlusCircle,
  CreditCard,
  Info,
  ArrowRight,
} from "lucide-react";

const RECIPIENTS = [
  {
    id: "REC_001",
    name: "Global Supply Co.",
    bank: "Chase Bank",
    currency: "USD",
    country: "미국",
  },
  {
    id: "REC_002",
    name: "Tech Parts Ltd.",
    bank: "MUFG Bank",
    currency: "JPY",
    country: "일본",
  },
  {
    id: "REC_003",
    name: "Euro Trading GmbH",
    bank: "Deutsche Bank",
    currency: "EUR",
    country: "독일",
  },
  {
    id: "REC_004",
    name: "London Logistics",
    bank: "HSBC Bank",
    currency: "GBP",
    country: "영국",
  },
  {
    id: "REC_005",
    name: "Beijing Tech",
    bank: "Bank of China",
    currency: "CNY",
    country: "중국",
  },
  {
    id: "REC_006",
    name: "Asia Pacific Ltd.",
    bank: "DBS Bank",
    currency: "SGD",
    country: "싱가포르",
  },
  {
    id: "REC_007",
    name: "HK Trading",
    bank: "Standard Chartered",
    currency: "HKD",
    country: "홍콩",
  },
  {
    id: "REC_008",
    name: "Sydney Import",
    bank: "ANZ Bank",
    currency: "AUD",
    country: "호주",
  },
  {
    id: "REC_009",
    name: "Canada Maple",
    bank: "RBC Bank",
    currency: "CAD",
    country: "캐나다",
  },
  {
    id: "REC_010",
    name: "Swiss Watch Co.",
    bank: "UBS",
    currency: "CHF",
    country: "스위스",
  },
];

const STEPS = ["접수", "환전", "송금", "완료"];

const SellerDashboard: React.FC = () => {
  const { showToast } = useToast();

  // 상태 변수 (누락된 항목 추가)
  const [selectedRecipient, setSelectedRecipient] = useState(RECIPIENTS[0]);
  const [amount, setAmount] = useState<string>("");
  const [currentRate, setCurrentRate] = useState<number>(1350);
  const [balance, setBalance] = useState<number>(0);
  const [isRemitModalOpen, setIsRemitModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false); // 누락 수정
  const [chargeAmount, setChargeAmount] = useState<number>(500000); // 누락 수정
  const [isProcessing, setIsProcessing] = useState(false);
  const [remitStep, setRemitStep] = useState(0);

  const FEE_RATE = 0.001;
  const CABLE_FEE = 5000;

  const baseKrw = Math.floor(Number(amount) * currentRate);
  const percentageFee = Math.floor(baseKrw * FEE_RATE);
  const totalFee = baseKrw > 0 ? CABLE_FEE + percentageFee : 0;
  const totalPayment = baseKrw + totalFee;

  const fetchBalance = async () => {
    try {
      const res = await fetch("/api/v1/user/balance");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBalance(Math.floor(data.krwBalance));
    } catch (error) {
      console.error("잔액 로드 실패");
    }
  };

  useEffect(() => {
    fetchBalance();
    const fetchLatestRate = async () => {
      try {
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=KRW&to=${selectedRecipient.currency}`,
        );
        const data = await response.json();
        const krwPerForeign = data.rates[selectedRecipient.currency];
        let rate = 1 / krwPerForeign;
        if (selectedRecipient.currency === "JPY") rate = rate * 100;
        setCurrentRate(Number(rate.toFixed(2)));
      } catch (error) {
        console.error("환율 로드 실패");
      }
    };
    fetchLatestRate();
  }, [selectedRecipient.currency]);

  const handleRequestPaymentV2 = async () => {
    const PortOne = (window as any).PortOne;
    if (!PortOne) {
      showToast("결제 모듈(V2)을 불러올 수 없습니다.", "ERROR");
      return;
    }
    try {
      const response = await PortOne.requestPayment({
        storeId: import.meta.env.VITE_PORTONE_STORE_ID,
        channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
        paymentId: `charge_${new Date().getTime()}`,
        orderName: "Ex-Ledger 자산 충전",
        totalAmount: chargeAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });
      if (response.code !== undefined) {
        showToast(`결제 실패: ${response.message}`, "ERROR");
        return;
      }
      const verifyRes = await fetch("/api/v1/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: response.paymentId }),
      });
      if (verifyRes.ok) {
        fetchBalance();
        setIsChargeModalOpen(false);
        showToast(
          `${chargeAmount.toLocaleString()}원 충전이 완료되었습니다.`,
          "SUCCESS",
        );
      }
    } catch (error) {
      showToast("결제 프로세스 중 오류가 발생했습니다.", "ERROR");
    }
  };

  const confirmRemittance = async () => {
    if (balance < totalPayment) {
      showToast("수수료를 포함한 잔액이 부족합니다.", "ERROR");
      return;
    }
    try {
      setIsRemitModalOpen(false);
      const res = await fetch("/api/v1/remittance/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedRecipient.id,
          targetCurrency: selectedRecipient.currency,
          targetAmount: Number(amount),
          appliedExchangeRate: currentRate,
          totalKrwAmount: totalPayment,
        }),
      });
      if (!res.ok) throw new Error();

      setIsProcessing(true);
      setRemitStep(0);
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep += 1;
        if (currentStep >= 3) {
          clearInterval(interval);
          setRemitStep(3);
          fetchBalance();
          showToast("송금이 성공적으로 완료되었습니다.", "SUCCESS");
          setTimeout(() => setIsProcessing(false), 8000);
        } else {
          setRemitStep(currentStep);
        }
      }, 4000);
    } catch (err) {
      showToast("송금 요청 중 오류가 발생했습니다.", "ERROR");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setChargeAmount(Number(value));
  };

  return (
    <CommonLayout>
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 bg-[#fcfdfe] min-h-screen animate-in fade-in duration-500">
        <header className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center text-teal-400 shadow-xl w-14 h-14 bg-slate-900 rounded-2xl">
              <Wallet size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Available KRW Balance
              </p>
              <h1 className="font-sans text-5xl font-black tracking-tighter text-slate-900">
                {balance.toLocaleString()}{" "}
                <span className="ml-1 text-xl font-medium text-slate-200">
                  KRW
                </span>
              </h1>
            </div>
          </div>
          {hasRole("ROLE_USER") ||
          hasRole("ROLE_COMPANY_ADMIN") ||
          hasRole("ROLE_COMPANY_USER") ? (
            <button
              onClick={() => setIsChargeModalOpen(true)}
              className="w-full px-10 py-5 text-sm font-black text-white transition-all shadow-2xl md:w-auto bg-slate-900 rounded-2xl hover:bg-slate-800 active:scale-95 shadow-slate-200"
            >
              자금 충전하기
            </button>
          ) : (
            <div className="px-6 py-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-400">
              충전 권한 없음
            </div>
          )}
        </header>

        <main className="grid items-start grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <section className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-100">
              <h2 className="px-2 mb-10 text-2xl font-black tracking-tighter text-slate-900">
                해외 수취인 선택
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {RECIPIENTS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRecipient(r);
                      setIsProcessing(false);
                    }}
                    className={`p-6 rounded-[32px] border-2 transition-all text-left flex items-center gap-5 ${selectedRecipient.id === r.id ? "border-blue-500 bg-blue-50/20 shadow-md" : "border-slate-50 hover:border-slate-100 bg-white"}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedRecipient.id === r.id ? "bg-blue-500 text-white shadow-lg" : "bg-slate-50 text-slate-300"}`}
                    >
                      <Building2 size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-[15px] tracking-tight truncate">
                        {r.name}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        {r.currency} · {r.country}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="sticky space-y-6 lg:col-span-5 top-10">
            <div className="bg-slate-900 rounded-[56px] p-12 space-y-10 shadow-2xl text-white">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-600 rounded-2xl">
                    <Send size={24} />
                  </div>
                  <h3 className="font-sans text-2xl font-black tracking-tighter uppercase">
                    Send Money
                  </h3>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">
                    Amount ({selectedRecipient.currency})
                  </label>
                  <div className="bg-white/5 rounded-[32px] p-10 border border-white/10 focus-within:border-blue-500">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full font-sans text-6xl font-black tracking-tighter bg-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-between px-6 py-4 font-sans text-xs font-bold border bg-white/5 rounded-2xl border-white/5">
                  <span className="text-slate-500 uppercase text-[9px]">
                    Rate
                  </span>
                  <span className="text-teal-400">
                    1 {selectedRecipient.currency} = {currentRate} KRW
                  </span>
                </div>
              </div>

              {/* 권한 및 로직 병합 수정 섹션 */}
              {hasRole("ROLE_USER") ||
              hasRole("ROLE_COMPANY_ADMIN") ||
              hasRole("ROLE_COMPANY_USER") ? (
                <>
                  {isProcessing && (
                    <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 space-y-8 animate-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between text-sm font-black">
                        <span>처리 상태</span>
                        <Loader2
                          className="text-blue-500 animate-spin"
                          size={16}
                        />
                      </div>
                      <div className="relative flex items-center justify-between px-2">
                        <div className="absolute top-1.5 left-4 right-4 h-[1px] bg-white/10 -z-10" />
                        {STEPS.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center gap-3"
                          >
                            <div
                              className={`w-3 h-3 rounded-full transition-all ${idx <= remitStep ? "bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.8)] scale-125" : "bg-white/10"}`}
                            />
                            <span
                              className={`text-[10px] font-black ${idx <= remitStep ? "text-white" : "text-slate-600"}`}
                            >
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setIsRemitModalOpen(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-8 rounded-[36px] font-black text-xl transition-all shadow-2xl active:scale-95"
                  >
                    해외 송금 실행
                  </button>
                </>
              ) : (
                <div className="w-full py-8 text-center bg-slate-800 rounded-[36px] text-slate-500 font-bold">
                  송금 권한이 없습니다
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* 최종 승인 모달 */}
        {isRemitModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl">
              <div className="space-y-2 text-center">
                <h3 className="text-3xl font-black tracking-tighter text-slate-900">
                  송금 명세서
                </h3>
                <p className="font-sans text-xs font-bold text-slate-400">
                  최종 승인 전 내용을 확인해 주세요.
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <div className="flex-1 font-sans text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      보내는 분
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      내 KRW 계좌
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-slate-200" />
                  <div className="flex-1 font-sans text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase">
                      받는 분
                    </p>
                    <p className="text-sm font-black text-slate-900">
                      {selectedRecipient.name}
                    </p>
                  </div>
                </div>
                <div className="px-2 space-y-4 font-sans">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-400">송금 원금</span>
                    <span className="text-slate-900">
                      {baseKrw.toLocaleString()} KRW
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-sm font-bold">
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 text-slate-400">
                        송금 수수료{" "}
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-md">
                          {(FEE_RATE * 100).toFixed(1)}%
                        </span>
                      </span>
                      <p className="text-[10px] text-slate-300 font-medium">
                        전신료 5,000원 포함
                      </p>
                    </div>
                    <span className="text-slate-900">
                      + {totalFee.toLocaleString()} KRW
                    </span>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-4" />
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-black text-slate-900">
                      총 결제 금액
                    </span>
                    <div className="text-right">
                      <p className="text-4xl font-black tracking-tighter text-blue-600">
                        {totalPayment.toLocaleString()}{" "}
                        <span className="text-sm">KRW</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsRemitModalOpen(false)}
                  className="flex-1 py-5 font-black text-slate-400 hover:bg-slate-50 rounded-2xl"
                >
                  취소
                </button>
                <button
                  onClick={confirmRemittance}
                  className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95"
                >
                  승인 및 송금
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 자금 충전 모달 */}
        {isChargeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[56px] p-12 space-y-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="text-3xl font-black tracking-tighter text-slate-900">
                  원화 자금 충전
                </h3>
                <button onClick={() => setIsChargeModalOpen(false)}>
                  <X size={32} className="text-slate-300" />
                </button>
              </div>
              <div className="space-y-8 font-sans">
                <div className="space-y-4 font-sans">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">
                    빠른 금액 선택
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[500000, 1000000, 5000000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setChargeAmount(amt)}
                        className={`py-4 rounded-2xl font-black text-sm border-2 transition-all ${chargeAmount === amt ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "border-slate-50 text-slate-400 hover:border-slate-200"}`}
                      >
                        {(amt / 10000).toLocaleString()}만원
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4 font-sans">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-sans">
                    직접 입력 (KRW)
                  </p>
                  <div className="relative font-sans group">
                    <input
                      type="text"
                      value={
                        chargeAmount === 0 ? "" : chargeAmount.toLocaleString()
                      }
                      onChange={handleAmountChange}
                      className="w-full p-8 font-sans text-4xl font-black tracking-tighter text-right border-2 outline-none bg-slate-50 rounded-3xl border-slate-100 focus:border-blue-500"
                      placeholder="0"
                    />
                    <div className="absolute font-sans font-bold -translate-y-1/2 left-8 top-1/2 text-slate-300">
                      ₩
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleRequestPaymentV2}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[36px] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <CreditCard size={24} /> 지금 결제하고 충전하기
              </button>
            </div>
          </div>
        )}
      </div>
    </CommonLayout>
  );
};

export default SellerDashboard;
