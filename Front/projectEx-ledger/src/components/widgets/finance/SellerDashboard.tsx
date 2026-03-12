import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../notification/ToastProvider";
import { useWallet } from "../../../context/WalletContext";

import AccountVerification from "../../pages/remittance/AccountVerification";
import RemittanceTracking from "../../pages/remittance/Tracking/RemittanceTracking";

import {
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  User,
  Coins,
  Globe,
  Wallet,
  ArrowLeft,
  Sparkles,
  Search,
  Loader2,
} from "lucide-react";

const SellerDashboard: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const {
    hasAccount,
    userAccount,
    setUserAccount,
    setHasAccount,
    balances,
    executeTransfer,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<"PERSONAL" | "BUSINESS">(
    "PERSONAL",
  );
  const [currencyMode, setCurrencyMode] = useState<"KRW" | "FOREIGN">("KRW");
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [currentRate, setCurrentRate] = useState<number>(1);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const sanitize = (val: any) => {
    const num =
      typeof val === "number"
        ? val
        : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const currentAvailableBalance =
    currencyMode === "KRW"
      ? sanitize(balances.KRW)
      : sanitize((balances as any)[targetCurrency]);
  const isSelfTransfer = recipientAccount === userAccount;

  // 1. 송금 원금 계산 (원화 환산)
  const baseKrw =
    currencyMode === "KRW"
      ? Math.floor(Number(transferAmount))
      : Math.floor(Number(transferAmount) * currentRate);

  /**
   * 🌟 [Gemini 추천 수수료 정책 적용]
   * 개인(PERSONAL): 망 이용료 500원 (최소 운영비) + 플랫폼 수수료 0.05% (고액 송금 혜택)
   * 기업(BUSINESS): 망 이용료 200원 (진입 장벽 완화) + 플랫폼 수수료 0.3% (수수료 수익 모델)
   */
  const commission =
    activeTab === "BUSINESS"
      ? { network: 200, serviceRate: 0.003 } // 기업 전용
      : { network: 500, serviceRate: 0.0005 }; // 개인 전용

  const calculatedFee =
    baseKrw > 0
      ? commission.network + Math.floor(baseKrw * commission.serviceRate)
      : 0;
  const totalRequiredKrw = baseKrw + calculatedFee;

  useEffect(() => {
    if (currencyMode === "FOREIGN") fetchLatestRate();
    else setCurrentRate(1);
  }, [targetCurrency, currencyMode]);

  const fetchLatestRate = async () => {
    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=KRW&to=${targetCurrency}`,
      );
      const data = await res.json();
      setCurrentRate(Number((1 / data.rates[targetCurrency]).toFixed(2)));
    } catch (err) {
      setCurrentRate(1350);
    }
  };

  const handleAccountCreationSuccess = (ownerName: string) => {
    // 개인용 가상계좌 발급 규칙 (1004)
    setUserAccount(`EX-1004-${Math.floor(1000 + Math.random() * 9000)}`);
    setHasAccount(true);
    showToast("개인용 가상계좌 발급이 완료되었습니다.", "SUCCESS");
  };

  const handleVerifyAccount = () => {
    if (!recipientAccount) {
      showToast("계좌번호를 입력해 주세요.", "ERROR");
      return;
    }
    if (isSelfTransfer) {
      showToast("본인 계좌로는 거래할 수 없습니다.", "ERROR");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      let foundAccount = false;
      let detectedName = "";
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("wallet_data_")) {
          const rawData = localStorage.getItem(key);
          if (rawData) {
            const otherData = JSON.parse(rawData);
            if (otherData.userAccount === recipientAccount) {
              foundAccount = true;
              // 기업용(2003) / 개인용(1004) 구별 로직 강화
              if (recipientAccount.includes("2003")) {
                  detectedName = "(주) 글로벌파트너스 (기업 계좌)";
              } else if (recipientAccount.includes("1004")) {
                  detectedName = "인증된 개인 사용자";
              } else {
                  detectedName = "인증된 외부 사용자";
              }
              break;
            }
          }
        }
      }
      if (foundAccount) {
        setRecipientName(detectedName);
        setIsAccountVerified(true);
        showToast("수취 계좌 확인 완료", "SUCCESS");
      } else {
        setIsAccountVerified(false);
        setRecipientName("");
        showToast("존재하지 않는 계좌번호입니다.", "ERROR");
      }
    }, 800);
  };

  const handleExecuteTransfer = () => {
    if (Number(transferAmount) <= 0) {
      showToast("이체 금액을 확인해 주세요.", "ERROR");
      return;
    }
    if (balances.KRW < totalRequiredKrw) {
      showToast("잔액이 부족합니다.", "ERROR");
      return;
    }
    setIsTransferModalOpen(false);
    setIsProcessing(true);
    setTimeout(() => {
      try {
        executeTransfer(
          recipientAccount,
          Number(transferAmount),
          currencyMode === "KRW" ? "KRW" : targetCurrency,
          currentRate,
          totalRequiredKrw,
          baseKrw,
          recipientName,
          activeTab,
        );
        showToast(
          `${activeTab === "BUSINESS" ? "기업 거래" : "개인 이체"} 완료`,
          "SUCCESS",
        );
        setTransferAmount("");
        setIsAccountVerified(false);
        setRecipientAccount("");
      } catch (error: any) {
        showToast(error.message, "ERROR");
      } finally {
        setIsProcessing(false);
      }
    }, 2500);
  };

  if (!hasAccount)
    return (
      <div className="max-w-4xl px-6 py-24 mx-auto space-y-16 text-center animate-in fade-in">
        <div className="space-y-6">
          <div className="bg-teal-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-100/50">
            <Sparkles size={40} />
          </div>
          <h1 className="text-4xl italic font-black tracking-tighter uppercase text-slate-900">
            지갑 활성화
          </h1>
        </div>
        <AccountVerification
          onVerificationSuccess={handleAccountCreationSuccess}
        />
      </div>
    );

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl p-10 mx-auto animate-in fade-in">
        <header className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              나의 계좌 번호
            </span>
            <span className="px-5 py-2 font-mono text-xs font-bold text-white shadow-lg bg-slate-900 rounded-2xl">
              {userAccount}
            </span>
          </div>
        </header>

        <div className="space-y-8">
          <RemittanceTracking
            status={isProcessing ? "PROCESSING" : "READY"}
            transactionId="TX-LIVE-88"
            updatedAt="실시간"
          />

          <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl space-y-12 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 rounded-full pointer-events-none bg-blue-500/5 blur-3xl" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-3xl">
                <button
                  onClick={() => setActiveTab("PERSONAL")}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${activeTab === "PERSONAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <User size={14} /> 개인 거래
                </button>
                <button
                  onClick={() => setActiveTab("BUSINESS")}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${activeTab === "BUSINESS" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Briefcase size={14} /> 기업 거래
                </button>
              </div>
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-3xl">
                <button
                  onClick={() => setCurrencyMode("KRW")}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${currencyMode === "KRW" ? "bg-slate-800 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Coins size={14} /> 원화
                </button>
                <button
                  onClick={() => setCurrencyMode("FOREIGN")}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 justify-center ${currencyMode === "FOREIGN" ? "bg-slate-800 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Globe size={14} /> 외화
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {activeTab === "BUSINESS"
                    ? "수취 기업 ID"
                    : "수취인 계좌 번호"}
                </label>
                <div className="flex items-center gap-1.5 text-teal-400 font-bold text-[11px]">
                  <Wallet size={12} />
                  <span>보유 잔액: {balances.KRW.toLocaleString()} KRW</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={recipientAccount}
                    onChange={(e) => {
                      setRecipientAccount(e.target.value);
                      setIsAccountVerified(false);
                    }}
                    placeholder="EX-0000-0000"
                    className={`w-full p-6 font-sans font-bold border outline-none bg-white/5 rounded-[24px] transition-all ${isSelfTransfer ? "border-red-500/50" : "border-white/10 focus:border-blue-500"}`}
                  />
                  {isProcessing && (
                    <div className="absolute -translate-y-1/2 right-6 top-1/2">
                      <Loader2
                        size={18}
                        className="animate-spin text-slate-500"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleVerifyAccount}
                  disabled={isProcessing || !recipientAccount}
                  className="px-8 text-xs font-black bg-white/10 hover:bg-white/20 rounded-[24px] transition-colors disabled:opacity-30"
                >
                  조회
                </button>
              </div>
              {isAccountVerified && (
                <div className="flex items-center gap-3 p-5 border bg-teal-500/10 rounded-[24px] border-teal-500/20 animate-in slide-in-from-top-2">
                  <CheckCircle2 size={18} className="text-teal-400" />
                  <span className="text-base italic font-black text-white">
                    {recipientName}
                  </span>
                  <span className="text-[10px] font-bold text-teal-500 uppercase ml-auto tracking-widest">
                    인증됨
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div
                className={`bg-white/5 rounded-[40px] p-10 border transition-all ${isAccountVerified ? "border-white/10 focus-within:border-blue-500" : "border-white/5 opacity-50"}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    이체 금액 설정
                  </p>
                  {currencyMode === "FOREIGN" ? (
                    <select
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                      className="px-4 py-2 text-sm font-bold outline-none cursor-pointer bg-slate-800 rounded-xl"
                    >
                      <option value="USD">🇺🇸 미국 달러 (USD)</option>
                      <option value="JPY">🇯🇵 일본 엔 (JPY)</option>
                      <option value="EUR">🇪🇺 유로 (EUR)</option>
                    </select>
                  ) : (
                    <span className="text-xl italic font-black opacity-30">
                      KRW (원화)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  value={transferAmount}
                  onKeyDown={(e) =>
                    ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (Number(val) >= 0 && !val.includes("-")))
                      setTransferAmount(val);
                  }}
                  className="w-full text-6xl italic font-black tracking-tighter bg-transparent outline-none"
                  placeholder="0"
                  disabled={!isAccountVerified}
                />
              </div>

              <div className="p-8 bg-blue-600/5 rounded-[32px] border border-white/5 flex justify-between items-end transition-all">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    인출 예정 금액 (수수료 포함)
                  </span>
                  <p className="text-[10px] text-slate-500 font-bold tracking-tight">
                    {activeTab === "PERSONAL"
                      ? `망 이용료(500원) + 서비스료(0.05%) 적용`
                      : `망 이용료(200원) + 서비스료(0.3%) 적용`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-4xl italic font-black tracking-tighter">
                    {totalRequiredKrw.toLocaleString()}
                  </span>
                  <span className="ml-2 text-xs font-bold uppercase text-slate-500">
                    원
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsTransferModalOpen(true)}
              disabled={!transferAmount || !isAccountVerified || isProcessing}
              className={`w-full py-8 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 disabled:opacity-10 font-sans uppercase transition-all tracking-widest italic ${activeTab === "BUSINESS" ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20" : "bg-teal-600 hover:bg-teal-500 shadow-teal-500/20"}`}
            >
              {activeTab === "BUSINESS" ? "기업 거래 실행" : "개인 이체 실행"}
            </button>
          </div>
        </div>
      </div>

      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <h3 className="font-sans text-3xl italic font-black tracking-tighter uppercase text-slate-900">
              최종 확인
            </h3>
            <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100">
              <p className="text-2xl italic font-black text-slate-900">
                {recipientName}
              </p>
              <p className="mt-1 font-mono text-xs font-bold tracking-widest uppercase text-slate-400">
                {recipientAccount}
              </p>
            </div>
            <div className="space-y-4 text-left">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-2 uppercase">
                <span>이체 원금</span>
                <span className="text-slate-900">
                  {baseKrw.toLocaleString()} KRW
                </span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                <span>서비스 총 수수료</span>
                <span className="text-red-500">
                  +{calculatedFee.toLocaleString()} KRW
                </span>
              </div>
              <div className="pt-4 text-center">
                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1">
                  총 인출 합계
                </p>
                <p className="text-4xl italic font-black tracking-tighter text-slate-900">
                  {totalRequiredKrw.toLocaleString()}{" "}
                  <span className="text-sm not-italic opacity-30">KRW</span>
                </p>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-5 text-xs font-black tracking-widest uppercase transition-colors text-slate-400 hover:text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleExecuteTransfer}
                className={`flex-[2] text-white py-5 rounded-2xl font-black shadow-xl uppercase text-xs tracking-[0.2em] transition-all active:scale-95 ${activeTab === "BUSINESS" ? "bg-blue-600" : "bg-teal-600"}`}
              >
                이체 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
