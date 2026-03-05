import React from "react";
import axios from "axios";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface ConsentProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  adjustedAmount: number; // 관리자가 수정한 최종 원화 금액
  onSuccess: () => void; // 동의 완료 후 호출될 콜백
}

const RemittanceConsentModal: React.FC<ConsentProps> = ({
  isOpen,
  onClose,
  transactionId,
  adjustedAmount,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const handleConsent = async () => {
    try {
      // 🌟 셀러가 수정 금액에 동의하여 PENDING 상태로 넘기는 API 호출
      await axios.post(`/api/v1/remittance/${transactionId}/consent`);
      alert("금액 동의가 완료되었습니다. 송금 대기 상태로 전환됩니다.");
      onSuccess();
      onClose();
    } catch (error) {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={32} />
          </div>

          <h2 className="mb-2 text-2xl font-black text-gray-900">
            정산 금액 수정 확인
          </h2>
          <p className="mb-8 text-sm font-medium text-gray-500">
            포트원 대조 결과 오차가 발견되어 관리자가 금액을 수정하였습니다.
            아래 최종 금액에 동의하십니까?
          </p>

          <div className="w-full p-6 mb-8 border border-gray-100 bg-gray-50 rounded-2xl">
            <span className="block mb-1 text-xs font-bold text-gray-400">
              최종 정산 예정 금액
            </span>
            <span className="text-3xl font-black text-blue-600">
              {adjustedAmount.toLocaleString()}{" "}
              <small className="text-sm">KRW</small>
            </span>
          </div>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 font-bold text-gray-500 transition-all bg-gray-100 rounded-2xl hover:bg-gray-200"
            >
              나중에 하기
            </button>
            <button
              onClick={handleConsent}
              className="flex items-center justify-center gap-2 py-4 font-black text-white transition-all bg-blue-600 shadow-lg flex-2 rounded-2xl shadow-blue-100 hover:bg-blue-700"
            >
              <CheckCircle size={18} /> 동의 및 송금 요청
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemittanceConsentModal;
