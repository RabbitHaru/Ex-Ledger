import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import CommonLayout from "../../layout/CommonLayout";
import ExchangeRateChart from "../../widgets/finance/ExchangeRateChart";
import AccountVerification from "./AccountVerification";
import RemittanceTracking from "./Tracking/RemittanceTracking";
import RemittanceRequestModal from "./RemittanceRequestModal";
import RemittanceConsentModal from "./RemittanceConsentModal";
import { Wallet, History, AlertCircle, ArrowLeftRight } from "lucide-react";
import type { ExchangeRate } from "../../../types/exchange";

const SellerDashboard = () => {
  const location = useLocation();
  const targetCurrency = location.state?.currencyCode || "USD";

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<any>("WAITING");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");

  useEffect(() => {
    fetch("http://localhost:8080/api/exchange/latest")
      .then((res) => res.json())
      .then((data) => setRates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("환율 로드 실패:", err));
  }, []);

  const currentRateInfo = rates.find((r) => r.curUnit.includes(targetCurrency));
  const currentRate = currentRateInfo?.rate || 0;

  // 🌟 원화 계산 로직 (소수점 완전 제거)
  const totalKRW = settleAmount * currentRate;
  const platformFee = Math.floor(totalKRW * 0.015); // 1.5% 수수료 절사
  const finalAmount = Math.max(0, Math.floor(totalKRW - platformFee)); // 최종 금액 절사

  return (
    <CommonLayout>
      <div className="w-full p-6 mx-auto lg:p-10 max-w-7xl">
        <div className="flex flex-col justify-between gap-4 mb-12 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 text-[11px] font-black text-white bg-teal-600 rounded-full uppercase tracking-wider">
                Active Settlement
              </span>
              <h1 className="text-3xl italic font-black tracking-tight text-slate-900">
                {targetCurrency} 정산 대시보드
              </h1>
            </div>
            <p className="font-medium text-[15px] text-slate-500">
              선택하신{" "}
              <span className="font-black text-slate-900">
                {targetCurrency}
              </span>{" "}
              통화에 대한 실시간 정산 프로세스입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 h-[480px]">
              <ExchangeRateChart
                rates={rates}
                selectedCurrency={targetCurrency}
              />
            </div>
            <AccountVerification onVerificationSuccess={setVerifiedName} />
          </div>

          <div className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-8 opacity-60">
                <Wallet size={20} />
                <span className="text-[11px] font-bold tracking-widest uppercase">
                  Settlement Calculator
                </span>
              </div>

              <div className="mb-10 space-y-6">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-tight">
                    정산 신청 금액 ({targetCurrency})
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={settleAmount || ""}
                      onChange={(e) => setSettleAmount(Number(e.target.value))}
                      className="w-full px-6 py-4 text-2xl font-black transition-all border outline-none bg-white/10 border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="pt-6 space-y-4 border-t border-white/5">
                  <div className="flex justify-between text-[14px]">
                    <span className="font-bold text-slate-400">적용 환율</span>
                    <span className="font-black">
                      {currentRate.toLocaleString()} KRW
                    </span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="font-bold text-slate-400">
                      플랫폼 수수료 (1.5%)
                    </span>
                    {/* 🌟 원화 소수점 제거 반영 */}
                    <span className="font-black text-red-400">
                      - {platformFee.toLocaleString()} KRW
                    </span>
                  </div>
                  <div className="flex items-end justify-between pt-4">
                    <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest">
                      최종 예상 수령액
                    </span>
                    <h2 className="text-3xl font-black tracking-tighter text-white">
                      {/* 🌟 원화 소수점 제거 반영 */}
                      {finalAmount.toLocaleString()}{" "}
                      <span className="text-sm">KRW</span>
                    </h2>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!settleAmount || settleAmount <= 0}
                className="flex items-center justify-center w-full gap-2 py-5 text-[15px] font-black transition-all bg-teal-500 hover:bg-teal-600 rounded-[24px] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-teal-900/20 active:scale-95"
              >
                <ArrowLeftRight size={18} /> 지금 정산 신청하기
              </button>
            </div>

            <RemittanceTracking
              status={currentStatus}
              transactionId="NEW-REQ"
              updatedAt="실시간 업데이트 중"
            />
          </div>
        </div>
      </div>

      <RemittanceRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReceiverName={verifiedName}
      />
      <RemittanceConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        transactionId="NEW-REQ"
        initialReceiverName={verifiedName}
        adjustedAmount={0}
        onSuccess={() => setCurrentStatus("PENDING")}
      />
    </CommonLayout>
  );
};

export default SellerDashboard;
