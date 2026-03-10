import React from "react";
import axios from "axios";
import { CheckCircle, AlertCircle, X, User } from "lucide-react";
import { toast } from 'sonner';

interface ConsentProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  initialReceiverName: string;
  adjustedAmount: number;
  onSuccess: () => void;
}

const RemittanceConsentModal: React.FC<ConsentProps> = ({
  isOpen,
  onClose,
  transactionId,
  initialReceiverName,
  adjustedAmount,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const handleConsent = async () => {
    try {
      await axios.post(`/api/v1/remittance/${transactionId}/consent`);
      toast.success("금액 동의가 완료되었습니다. 송금 대기 상태로 전환됩니다.");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full shadow-inner bg-amber-100 text-amber-600">
            <AlertCircle size={40} />
          </div>

          <h2 className="mb-2 text-2xl font-black text-gray-900">
            정산 금액 수정 확인
          </h2>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full mb-6">
            <User size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-600">
              수취인: {initialReceiverName}
            </span>
          </div>

          <p className="mb-8 text-sm font-medium leading-relaxed text-gray-400">
            포트원 결제 대조 결과 오차가 발견되어 관리자가 금액을
            수정하였습니다. 최종 정산액을 확인 후 동의해주세요.
          </p>

          <div className="w-full p-8 bg-blue-50/50 rounded-[24px] border border-blue-100/50 mb-10">
            <span className="text-[11px] font-black text-blue-400 block mb-2 uppercase tracking-widest">
              Final Adjusted Amount
            </span>
            <span className="text-4xl font-black text-blue-600">
              {adjustedAmount.toLocaleString()}{" "}
              <small className="text-sm text-blue-400">KRW</small>
            </span>
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-5 font-bold text-gray-400 transition-all bg-gray-50 rounded-2xl hover:bg-gray-100 active:scale-95"
            >
              닫기
            </button>
            <button
              onClick={handleConsent}
              className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle size={20} /> 금액 동의 및 신청
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemittanceConsentModal;
