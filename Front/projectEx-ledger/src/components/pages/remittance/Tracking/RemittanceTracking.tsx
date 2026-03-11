import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommonLayout from "../../../layout/CommonLayout";
import {
  CheckCircle2,
  Search,
  PlaneTakeoff,
  Landmark,
  ShieldCheck,
  ArrowLeft,
  FileText,
} from "lucide-react";
// 🌟 1. 'verbatimModuleSyntax' 대응: 타입 전용 가져오기
import type { LucideIcon } from "lucide-react";

interface RemittanceTrackingProps {
  status?: string;
  transactionId?: string;
  updatedAt?: string;
}

// 🌟 2. 단계를 정의하는 인터페이스
interface TrackingStep {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const RemittanceTracking: React.FC<RemittanceTrackingProps> = ({
  status: propsStatus,
  transactionId: propsTxId,
  updatedAt: propsUpdatedAt,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isWidgetMode = Boolean(propsStatus);

  // 데이터 바인딩 (대시보드에서 넘겨준 props 또는 상세 페이지 state)
  const txData = location.state?.transaction || {
    id: propsTxId || "TX-LIVE-8821",
    status: propsStatus || "READY",
    currency: "KRW",
    finalAmount: 0,
  };

  // 🌟 3. [문구 수정] '환전'을 제거하고 일반 거래/이체 단계로 변경
  const steps: TrackingStep[] = [
    {
      key: "REVIEWING",
      label: "검토 중",
      desc: "거래 승인을 위한 검토가 진행 중입니다.",
      icon: Search,
    },
    {
      key: "APPROVED",
      label: "승인 완료",
      desc: "이체 요청이 최종 승인되었습니다.",
      icon: Landmark,
    },
    {
      key: "TRANSFERRING",
      label: "이체 진행",
      desc: "자금 이체 및 정산이 진행 중입니다.",
      icon: PlaneTakeoff,
    },
    {
      key: "COMPLETED",
      label: "거래 완료",
      desc: "모든 이체 및 정산 절차가 완료되었습니다.",
      icon: CheckCircle2,
    },
  ];

  // 상태값에 따른 인덱스 반환 (READY/PROCESSING 대응)
  const getActiveIndex = (statusName: string) => {
    if (["READY", "WAITING", "REVIEWING"].includes(statusName)) return 0;
    if (statusName === "APPROVED") return 1;
    if (["PROCESSING", "TRANSFERRING", "PENDING"].includes(statusName))
      return 2;
    if (statusName === "COMPLETED" || statusName === "DONE") return 3;
    return 0;
  };

  const currentStepIndex = getActiveIndex(txData.status);

  // --- 🌟 레이아웃 A: 대시보드용 위젯 (컴팩트 버전) ---
  const renderWidget = () => (
    <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[40px] border border-white/5 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-teal-400" size={18} />
          <h3 className="text-xs italic font-black tracking-tight text-white uppercase">
            Transaction Status
          </h3>
        </div>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          {txData.id}
        </span>
      </div>

      <div className="relative flex justify-between px-2">
        {/* 진행선 애니메이션 */}
        <div className="absolute top-4 left-0 w-full h-[1px] bg-white/5 -z-0" />
        <div
          className="absolute top-4 left-0 h-[1px] bg-teal-500 transition-all duration-1000 shadow-[0_0_8px_rgba(20,184,166,0.5)]"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex;
          const StepIcon = step.icon;
          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isActive
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20 scale-110"
                    : "bg-slate-800 text-slate-600"
                }`}
              >
                {isActive && index < currentStepIndex ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <StepIcon size={16} />
                )}
              </div>
              <span
                className={`text-[9px] font-black tracking-tighter ${isActive ? "text-teal-400" : "text-slate-600"}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- 🌟 레이아웃 B: 전체 페이지용 (상세 버전) ---
  const renderPage = () => (
    <CommonLayout>
      <div className="max-w-6xl px-6 py-12 mx-auto duration-700 animate-in fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-teal-600 font-black text-[11px] mb-10 transition-all uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="bg-white p-12 md:p-16 rounded-[56px] shadow-sm border border-slate-50">
              <div className="flex items-center gap-4 mb-20">
                <div className="flex items-center justify-center shadow-xl w-14 h-14 bg-slate-900 rounded-2xl">
                  <ShieldCheck className="text-teal-400" size={28} />
                </div>
                <div>
                  <h2 className="text-3xl italic font-black tracking-tighter uppercase text-slate-900">
                    Status Tracking
                  </h2>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
                    Real-time Transaction Ledger
                  </p>
                </div>
              </div>

              <div className="relative ml-8 space-y-20">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCurrent = index === currentStepIndex;
                  const isPast = index < currentStepIndex;
                  return (
                    <div key={step.key} className="relative flex gap-12 group">
                      {index !== steps.length - 1 && (
                        <div
                          className={`absolute left-7 top-16 w-[1px] h-[calc(100%+24px)] ${isPast ? "bg-teal-500" : "bg-slate-100"}`}
                        />
                      )}
                      <div
                        className={`relative z-10 w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-500 ${
                          isPast
                            ? "bg-teal-500 text-white shadow-lg shadow-teal-100"
                            : isCurrent
                              ? "bg-slate-900 text-white scale-125 shadow-2xl"
                              : "bg-slate-50 text-slate-200"
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <StepIcon size={24} />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <span
                          className={`text-xl font-black tracking-tight ${isCurrent ? "text-slate-900" : isPast ? "text-teal-600" : "text-slate-300"}`}
                        >
                          {step.label}
                        </span>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-400">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden border border-white/5">
              <div className="flex items-center gap-3 mb-12 opacity-30">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                  Summary
                </span>
              </div>
              <div className="space-y-10">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Transaction ID
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-200">
                    {txData.id}
                  </p>
                </div>
                <div className="pt-10 border-t border-white/5">
                  <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-2">
                    Status
                  </p>
                  <p className="text-2xl italic font-black tracking-tighter text-white">
                    {steps[currentStepIndex].label}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommonLayout>
  );

  return isWidgetMode ? renderWidget() : renderPage();
};

export default RemittanceTracking;
