import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Send, AlertCircle, ShieldCheck } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReceiverName: string;
  // 🌟 Step 3 핵심: 대시보드에서 계산된 실시간 데이터를 받습니다.
  settlementData: {
    amount: number; // 외화 신청 금액
    currency: string; // 통화 코드 (USD, JPY 등)
    rate: number; // 적용 환율
    fee: number; // 플랫폼 수수료 (1.5%)
    finalAmount: number; // 최종 KRW 수령액
  };
  onSuccess?: (transactionId: string) => void;
}

const RemittanceRequestModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  initialReceiverName,
  settlementData,
  onSuccess,
}) => {
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipientName(initialReceiverName || "");
    }
  }, [isOpen, initialReceiverName]);

  // 🌟 Step 3 핵심 로직: 실제 송금/정산 신청 API 호출
  const handleRemittanceSubmit = async () => {
    if (settlementData.amount <= 0 || !recipientName) {
      return alert("신청 금액과 수취인 정보를 확인해주세요.");
    }

    setLoading(true);
    try {
      // 명세서의 [송금 핵심] 로직 구현: 백엔드로 데이터 전송
      const response = await axios.post("/api/v1/remittance/request", {
        recipientName,
        sourceAmount: settlementData.amount,
        currencyCode: settlementData.currency,
        exchangeRate: settlementData.rate,
        feeAmount: settlementData.fee,
        targetAmount: settlementData.finalAmount, // KRW 최종액
        status: "PENDING", // 신청 즉시 '검토 중' 상태로 진입
      });

      alert("정산 및 송금 신청이 완료되었습니다.");
      if (onSuccess) onSuccess(response.data.transactionId);
      onClose();
    } catch (err) {
      console.error("신청 오류:", err);
      alert("신청 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute transition-colors text-slate-300 top-8 right-8 hover:text-slate-600"
        >
          <X size={24} />
        </button>

        {/* 헤더 섹션 */}
        <div className="p-10 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-teal-600" size={20} />
            <h2 className="text-2xl font-black tracking-tight text-slate-800">
              정산 신청 확인
            </h2>
          </div>
          <p className="text-sm font-bold text-slate-400">
            입력하신 정보를 바탕으로 최종 정산을 진행합니다.
          </p>
        </div>

        <div className="px-10 space-y-6">
          {/* 수취인 정보 (계좌 실명 인증 연동) */}
          <div>
            <label className="block mb-2 ml-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              정산 수취인 (실명 인증)
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              readOnly={!!initialReceiverName}
              placeholder="인증된 예금주명이 표시됩니다"
              className={`w-full p-4 rounded-2xl text-lg font-bold outline-none transition-all ${
                initialReceiverName
                  ? "bg-teal-50 text-teal-700 border border-teal-100 cursor-not-allowed"
                  : "bg-slate-50 text-slate-800 border border-slate-100 focus:ring-2 focus:ring-teal-500/20"
              }`}
            />
          </div>

          {/* 정산 상세 내역 요약 */}
          <div className="p-6 space-y-4 bg-slate-900 rounded-[32px] text-white">
            <div className="flex justify-between text-sm">
              <span className="font-bold tracking-tight text-slate-400">
                신청 금액 ({settlementData.currency})
              </span>
              <span className="font-mono font-black">
                {settlementData.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold tracking-tight text-slate-400">
                적용 환율
              </span>
              <span className="font-bold text-slate-200">
                1 {settlementData.currency} ={" "}
                {settlementData.rate.toLocaleString()} KRW
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-red-400/80">
                플랫폼 이용료 (1.5%)
              </span>
              <span className="font-bold text-red-400">
                - {settlementData.fee.toLocaleString()} KRW
              </span>
            </div>

            <div className="flex items-end justify-between pt-4 mt-2 border-t border-white/10">
              <span className="text-xs font-black tracking-widest text-teal-400 uppercase">
                최종 예상 수령액
              </span>
              <span className="text-3xl font-black tracking-tighter text-white">
                {settlementData.finalAmount.toLocaleString()}{" "}
                <small className="text-sm font-bold opacity-50">KRW</small>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
              최종 승인 후에는 취소가 불가능합니다. 실시간 환율 변동에 따라 실제
              수령액은 미세한 차이가 발생할 수 있음에 동의합니다.
            </p>
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex gap-3 p-10">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-[15px] font-black text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleRemittanceSubmit}
            disabled={loading}
            className="flex-1 py-5 text-[15px] font-black text-white bg-teal-600 shadow-xl shadow-teal-900/20 rounded-2xl hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "처리 중..."
            ) : (
              <>
                <Send size={18} /> 신청 확정하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemittanceRequestModal;
