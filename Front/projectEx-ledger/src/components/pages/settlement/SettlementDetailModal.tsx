import React from "react";
import {
  X,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Percent,
} from "lucide-react";

type RemittanceStatus =
  | "WAITING"
  | "DISCREPANCY"
  | "WAITING_USER_CONSENT"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    id: string;
    createdAt: string;
    amountUsd: number;
    exchangeRate: number;
    feeBreakdown: {
      platform: number;
      network: number;
      vat: number;
    };
    finalAmountKrw: number;
    status: RemittanceStatus;
  } | null;
}

const SettlementDetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const totalFee =
    data.feeBreakdown.platform +
    data.feeBreakdown.network +
    data.feeBreakdown.vat;

  const getStatusInfo = (status: RemittanceStatus) => {
    switch (status) {
      case "COMPLETED":
        return {
          label: "정산 완료",
          color: "text-teal-600",
          bg: "bg-teal-50",
          icon: <CheckCircle size={20} />,
        };
      case "WAITING_USER_CONSENT":
        return {
          label: "금액 동의 대기",
          color: "text-amber-600",
          bg: "bg-amber-50",
          icon: <AlertCircle size={20} />,
        };
      case "PENDING":
        return {
          label: "송금 진행 중",
          color: "text-blue-600",
          bg: "bg-blue-50",
          icon: <Clock size={20} />,
        };
      case "FAILED":
        return {
          label: "처리 실패",
          color: "text-red-600",
          bg: "bg-red-50",
          icon: <AlertCircle size={20} />,
        };
      default:
        return {
          label: "승인 대기",
          color: "text-slate-500",
          bg: "bg-slate-50",
          icon: <Clock size={20} />,
        };
    }
  };

  const statusInfo = getStatusInfo(data.status);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="flex items-center justify-between p-8 border-b border-slate-50 bg-slate-50/30">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              정산 상세 내역
            </h2>
            <p className="mt-1 text-xs font-bold tracking-widest uppercase text-slate-400">
              {data.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 transition-colors bg-white border shadow-sm border-slate-100 text-slate-400 rounded-2xl hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div
            className={`p-5 rounded-[24px] border ${statusInfo.bg} border-current/10 flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <div className={statusInfo.color}>{statusInfo.icon}</div>
              <span className={`text-sm font-black ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {data.createdAt}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-bold text-slate-400">
                <DollarSign size={16} /> 송금 신청 금액
              </span>
              <span className="text-lg font-black text-slate-900">
                $ {data.amountUsd.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-bold text-slate-400">
                <ArrowRight size={16} /> 적용 환율
              </span>
              <span className="font-black text-slate-900">
                1 USD = {data.exchangeRate.toLocaleString()} KRW
              </span>
            </div>

            {/* 🌟 수수료 상세 명세 영역 */}
            <div className="p-6 bg-slate-50 rounded-[28px] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                <span className="flex items-center gap-2 text-xs font-black text-slate-500">
                  <Percent size={14} /> 총 차감 수수료
                </span>
                <span className="text-sm font-black text-red-500">
                  - {totalFee.toLocaleString()} KRW
                </span>
              </div>
              <div className="pt-1 space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>플랫폼 서비스 이용료</span>
                  <span>{data.feeBreakdown.platform.toLocaleString()} KRW</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>해외 송금 망 사용료</span>
                  <span>{data.feeBreakdown.network.toLocaleString()} KRW</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>부가세 (VAT)</span>
                  <span>{data.feeBreakdown.vat.toLocaleString()} KRW</span>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex items-end justify-between pt-2">
              <span className="text-sm font-bold text-slate-400">
                최종 정산 금액
              </span>
              <div className="text-right">
                <span className="text-3xl font-black text-teal-600">
                  {data.finalAmountKrw.toLocaleString()}
                </span>
                <span className="ml-1 text-sm font-black text-teal-600">
                  KRW
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full py-5 text-sm font-black transition-all bg-white border shadow-sm border-slate-200 text-slate-800 rounded-2xl hover:bg-slate-50 active:scale-95"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementDetailModal;
