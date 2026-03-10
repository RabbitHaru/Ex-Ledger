import React, { useState, useEffect } from "react";
// axios는 시뮬레이션 모드에서 사용하지 않으므로 주석 처리하거나 남겨두셔도 됩니다.
// import axios from "axios";
import { X, Send, AlertCircle, ShieldCheck } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReceiverName: string;
  settlementData: {
    amount: number; // 외화 신청 금액 (또는 역환전된 외화액)
    currency: string; // 통화 코드
    rate: number; // 적용 환율
    fee: number; // 수수료
    finalAmount: number; // 최종 KRW (또는 송금 원화액)
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

  // 🌟 시뮬레이션 핵심 로직: 백엔드 서버 없이 성공 시나리오를 만듭니다.
  const handleRemittanceSubmit = async () => {
    if (settlementData.amount <= 0 || !recipientName) {
      return alert("신청 금액과 수취인 정보를 확인해주세요.");
    }

    setLoading(true);
    try {
      // 1. 실제 서버로 데이터를 보내는 대신 콘솔에 기록합니다. (디버깅용)
      console.log("송금 신청 데이터(시뮬레이션):", {
        recipientName,
        ...settlementData,
        requestDate: new Date().toISOString(),
      });

      // 2. 1.5초간 네트워크 통신을 하는 것처럼 대기합니다.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 3. 서버에서 생성해주는 것과 같은 가짜 트랜잭션 ID를 만듭니다.
      const mockTransactionId = `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      alert("해외 송금 신청이 성공적으로 완료되었습니다.");

      // 4. 대시보드로 성공 신호를 보냅니다. (트래킹 위젯 활성화)
      if (onSuccess) {
        onSuccess(mockTransactionId);
      }
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
              송금 신청 최종 확인
            </h2>
          </div>
          <p className="text-sm font-bold text-slate-400">
            글로벌 뱅킹 시스템을 통해 안전하게 자금을 전송합니다.
          </p>
        </div>

        <div className="px-10 space-y-6">
          {/* 수취인 정보 */}
          <div>
            <label className="block mb-2 ml-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              해외 수취인 명칭
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              readOnly={!!initialReceiverName}
              className={`w-full p-4 rounded-2xl text-lg font-bold outline-none transition-all ${
                initialReceiverName
                  ? "bg-teal-50 text-teal-700 border border-teal-100 cursor-not-allowed"
                  : "bg-slate-50 text-slate-800 border border-slate-100 focus:ring-2 focus:ring-teal-500/20"
              }`}
            />
          </div>

          {/* 상세 내역 요약 */}
          <div className="p-6 space-y-4 bg-slate-900 rounded-[32px] text-white">
            <div className="flex justify-between text-sm">
              <span className="font-bold tracking-tight text-slate-400">
                현지 수령액 ({settlementData.currency})
              </span>
              <span className="font-mono text-lg font-black text-teal-400">
                {settlementData.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold tracking-tight text-slate-400">
                적용 환율 (1 KRW당)
              </span>
              <span className="font-bold text-slate-200">
                {settlementData.rate.toFixed(6)} {settlementData.currency}
              </span>
            </div>
            <div className="flex items-end justify-between pt-4 mt-2 border-t border-white/10">
              <span className="text-xs font-black tracking-widest uppercase text-slate-500">
                총 차감 금액 (KRW)
              </span>
              <span className="text-3xl font-black tracking-tighter text-white">
                {settlementData.finalAmount.toLocaleString()}
                <small className="ml-1 text-sm font-bold opacity-50">KRW</small>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
              본 송금은 국제 자금 세탁 방지 규정을 준수합니다. 승인 후에는 국제
              은행망을 통해 전송되므로 취소가 불가능합니다.
            </p>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 p-10">
          <button
            onClick={onClose}
            className="flex-1 py-5 text-[15px] font-black text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200"
          >
            취소
          </button>
          <button
            onClick={handleRemittanceSubmit}
            disabled={loading}
            className="flex-1 py-5 text-[15px] font-black text-white bg-teal-600 shadow-xl shadow-teal-900/20 rounded-2xl hover:bg-teal-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "네트워크 통신 중..."
            ) : (
              <>
                <Send size={18} /> 송금 확정하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemittanceRequestModal;
