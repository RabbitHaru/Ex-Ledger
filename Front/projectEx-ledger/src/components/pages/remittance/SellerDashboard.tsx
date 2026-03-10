import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import CommonLayout from "../../layout/CommonLayout";
import ExchangeRateChart from "../../widgets/finance/ExchangeRateChart";
import AccountVerification from "./AccountVerification";
import RemittanceTracking from "./Tracking/RemittanceTracking";
import RemittanceRequestModal from "./RemittanceRequestModal";
// 🌟 토스트 알림 훅 임포트
import { useToast } from "../../../components/notification/ToastProvider";
import {
  Wallet,
  ArrowLeftRight,
  Coins,
  Send,
  Globe,
  Activity,
  ClipboardCheck,
  Landmark,
} from "lucide-react";
import type { ExchangeRate } from "../../../types/exchange";

const SellerDashboard = () => {
  // 🌟 ToastContextType의 실제 구현에 맞춰 showToast 추출
  const { showToast } = useToast();
  const location = useLocation();
  const [rates, setRates] = useState<ExchangeRate[]>([]);

  // 🌟 [핀테크 로직] 보유한 원화(KRW)를 외화로 바꿔 보내는 구조
  const [krwBalance, setKrwBalance] = useState<number>(25400000); // 2,540만원 보유
  const [outboundAmount, setOutboundAmount] = useState<number>(0); // 송금할 원화 금액
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [liveRate, setLiveRate] = useState<number>(0);

  // 시뮬레이션용 해외 수취인 데이터
  const [beneficiaries] = useState([
    {
      id: 1,
      name: "Global Supply Co.",
      country: "USA",
      bank: "Chase Bank",
      swift: "CHASUS33",
    },
    {
      id: 2,
      name: "Tech Parts Ltd.",
      country: "Japan",
      bank: "MUFG Bank",
      swift: "MUFGJPJT",
    },
  ]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<number | null>(
    null,
  );

  const [currentStatus, setCurrentStatus] = useState<any>("WAITING");
  const [currentTxId, setCurrentTxId] = useState<string>("NEW-REQ");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");

  // 🌟 Frankfurter 무료 API로 실시간 환율 가져오기
  useEffect(() => {
    const fetchLiveRate = async () => {
      try {
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=KRW&to=${targetCurrency}`,
        );
        const data = await res.json();
        setLiveRate(data.rates[targetCurrency]);
      } catch (err) {
        console.error("환율 로드 실패:", err);
      }
    };
    fetchLiveRate();
  }, [targetCurrency]);

  const estimatedFX = outboundAmount * liveRate;

  const handleRequestSuccess = (transactionId: string) => {
    setCurrentTxId(transactionId);
    setCurrentStatus("REVIEWING");

    showToast(
      `해외 송금 시작: ${targetCurrency} ${estimatedFX.toFixed(2)} 검토 중`,
      "INFO",
    );

    // 4초 뒤: 2단계 환전 완료
    setTimeout(() => setCurrentStatus("EXCHANGED"), 4000);

    // 8초 뒤: 3단계 현지 송금 중
    setTimeout(() => setCurrentStatus("TRANSFERRING"), 8000);

    // 12초 뒤: 4단계 최종 완료 시뮬레이션
    setTimeout(() => {
      setCurrentStatus("COMPLETED");
      setKrwBalance((prev) => prev - outboundAmount);

      showToast("해외 현지 은행으로 송금이 최종 완료되었습니다.", "SUCCESS");
    }, 12000);
  };

  const handleSendMoney = () => {
    if (outboundAmount > krwBalance) {
      alert("잔액이 부족합니다.");
      return;
    }
    setCurrentTxId(
      `OUT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    );
    setIsModalOpen(true);
  };

  return (
    <CommonLayout>
      <div className="w-full p-6 mx-auto lg:p-10 max-w-7xl">
        {/* 상단: 자산 요약 섹션 */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
          <div className="md:col-span-2 bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3 opacity-50">
                <Wallet size={16} />
                <p className="text-[11px] font-black uppercase tracking-widest">
                  Available KRW Balance
                </p>
              </div>
              <h2 className="text-5xl font-black tracking-tighter">
                {krwBalance.toLocaleString()}
                <span className="ml-2 text-2xl font-bold text-teal-400 text-opacity-80">
                  KRW
                </span>
              </h2>
              <div className="flex items-center gap-4 mt-8">
                <span className="px-4 py-2 bg-white/10 rounded-2xl text-[12px] font-bold text-teal-400">
                  송금 가능
                </span>
              </div>
            </div>
            <Activity
              size={120}
              className="absolute transition-all duration-700 -right-4 -bottom-4 text-white/5 group-hover:text-white/10"
            />
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-6">
                Current Processing
              </p>
              <div className="flex items-center gap-3">
                <div className="p-2 text-teal-600 rounded-lg bg-teal-50">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    최근 활동
                  </p>
                  <h4 className="text-xl font-black text-slate-900">
                    {currentStatus === "COMPLETED" ? "처리 완료" : "진행 중"}
                  </h4>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50">
              <div className="w-full h-1.5 overflow-hidden rounded-full bg-slate-50">
                <div
                  className={`h-full transition-all duration-1000 ${currentStatus === "COMPLETED" ? "w-full bg-teal-500" : "w-[30%] bg-amber-400"}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {/* 해외 수취인 선택 영역 */}
            <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
              <h3 className="flex items-center gap-2 mb-6 text-lg font-black text-slate-800">
                <Globe size={20} className="text-teal-600" /> 해외 수취인 선택
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {beneficiaries.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBeneficiary(b.id);
                      setTargetCurrency(b.country === "USA" ? "USD" : "JPY");
                    }}
                    className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all ${selectedBeneficiary === b.id ? "border-teal-500 bg-teal-50/30" : "border-slate-50 hover:border-slate-200"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 text-white bg-slate-900 rounded-2xl">
                        <Landmark size={20} />
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase">
                        {b.swift}
                      </span>
                    </div>
                    <p className="font-black text-slate-800">{b.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {b.bank} ({b.country})
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 h-[400px]">
              <ExchangeRateChart rates={[]} selectedCurrency={targetCurrency} />
            </div>
          </div>

          <div className="space-y-8">
            {/* 송금 계산기 */}
            <div className="bg-slate-900 p-9 rounded-[48px] text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="flex items-center gap-3 mb-10 opacity-60">
                <Send size={20} className="text-teal-400" />
                <span className="text-[11px] font-bold tracking-widest uppercase">
                  Global Payout
                </span>
              </div>
              <input
                type="number"
                placeholder="0"
                value={outboundAmount || ""}
                onChange={(e) => setOutboundAmount(Number(e.target.value))}
                className="w-full px-6 py-5 text-3xl font-black border outline-none bg-white/5 border-white/10 rounded-3xl focus:ring-2 focus:ring-teal-500/50"
              />
              <button
                onClick={handleSendMoney}
                disabled={
                  !selectedBeneficiary ||
                  outboundAmount <= 0 ||
                  outboundAmount > krwBalance
                }
                className="w-full mt-8 py-6 bg-teal-500 hover:bg-teal-600 rounded-[28px] font-black text-white shadow-xl shadow-teal-900/40"
              >
                <Send size={20} className="inline mr-2" /> 해외 송금 실행
              </button>
            </div>
            {/* 하단 트래킹 위젯 */}
            <RemittanceTracking
              status={currentStatus}
              transactionId={currentTxId}
              updatedAt="실시간 업데이트 중"
            />
          </div>
        </div>
      </div>

      <RemittanceRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReceiverName={
          beneficiaries.find((b) => b.id === selectedBeneficiary)?.name || ""
        }
        onSuccess={handleRequestSuccess}
        settlementData={{
          amount: estimatedFX,
          currency: targetCurrency,
          rate: liveRate,
          fee: 0,
          finalAmount: outboundAmount,
        }}
      />
    </CommonLayout>
  );
};

export default SellerDashboard;
