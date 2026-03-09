import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommonLayout from "../../../layout/CommonLayout";
import {
  CheckCircle2,
  Clock,
  Search,
  PlaneTakeoff,
  Landmark,
  ShieldCheck,
  ArrowLeft,
  FileText,
  AlertCircle,
} from "lucide-react";

type TrackingStatus =
  | "REVIEWING"
  | "EXCHANGED"
  | "TRANSFERRING"
  | "COMPLETED"
  | "FAILED";

const RemittanceTracking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 대시보드에서 넘어온 데이터가 없으면 사용할 Mock 데이터
  const txData = location.state?.transaction || {
    id: "TRX-20260305-88A2",
    status: "TRANSFERRING",
    currency: "USD",
    amount: 12450.0,
    rate: 1456.2,
    finalAmount: 18130000,
    requestDate: "2026-03-05 15:25",
  };

  const steps = [
    {
      key: "REVIEWING",
      label: "검토 중",
      desc: "정산 요청 서류를 확인하고 있습니다.",
      icon: <Search size={22} />,
    },
    {
      key: "EXCHANGED",
      label: "환전 완료",
      desc: "실시간 환율로 외화 환전이 완료되었습니다.",
      icon: <Landmark size={22} />,
    },
    {
      key: "TRANSFERRING",
      label: "해외 송금 중",
      desc: "국제 망을 통해 송금이 진행 중입니다.",
      icon: <PlaneTakeoff size={22} />,
    },
    {
      key: "COMPLETED",
      label: "완료",
      desc: "지정 계좌로 입금이 최종 완료되었습니다.",
      icon: <CheckCircle2 size={22} />,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === txData.status);
  const isFailed = txData.status === "FAILED";

  return (
    <CommonLayout>
      <div className="max-w-6xl px-6 py-12 mx-auto">
        {/* 상단 네비게이션 */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-teal-600 font-black text-[13px] mb-10 transition-all active:scale-95"
        >
          <ArrowLeft size={16} /> 대시보드로 돌아가기
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* 좌측: 실시간 트래킹 스테퍼 */}
          <div className="lg:col-span-2">
            <div className="bg-white p-10 md:p-14 rounded-[48px] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-16">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-teal-600 shadow-lg rounded-2xl shadow-teal-100">
                    <ShieldCheck className="text-white" size={26} />
                  </div>
                  <div>
                    <h2 className="text-2xl italic font-black tracking-tighter text-slate-800">
                      송금 진행 현황
                    </h2>
                    <p className="mt-1 text-xs font-bold tracking-widest uppercase text-slate-300">
                      Status Tracking
                    </p>
                  </div>
                </div>
                {isFailed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-full text-[11px] font-black animate-pulse">
                    <AlertCircle size={14} /> 송금 실패
                  </div>
                )}
              </div>

              {/* 4단계 수직 스테퍼 로직 */}
              <div className="relative ml-6 space-y-16">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.key} className="relative flex gap-10 group">
                      {/* 수직 라인 */}
                      {index !== steps.length - 1 && (
                        <div
                          className={`absolute left-7 top-14 w-0.5 h-[calc(100%+8px)] transition-colors duration-700 ${isCompleted ? "bg-teal-600" : "bg-slate-100"}`}
                        />
                      )}

                      {/* 상태 아이콘 박스 */}
                      <div
                        className={`relative z-10 w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? "bg-teal-600 text-white shadow-lg shadow-teal-100"
                            : isCurrent
                              ? "bg-slate-900 text-white shadow-2xl scale-110"
                              : "bg-slate-50 text-slate-200"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={24} /> : step.icon}
                      </div>

                      {/* 텍스트 설명 */}
                      <div className="flex flex-col justify-center">
                        <span
                          className={`text-lg font-black tracking-tight ${isCurrent ? "text-slate-900" : isCompleted ? "text-teal-600" : "text-slate-300"}`}
                        >
                          {step.label}
                        </span>
                        <p
                          className={`text-sm font-bold mt-1.5 ${isCurrent ? "text-slate-500" : "text-slate-300"}`}
                        >
                          {step.desc}
                        </p>
                        {isCurrent && (
                          <div className="flex items-center gap-2 mt-4">
                            <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse">
                              Processing Now
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 우측: 정산 상세 정보 */}
          <div className="space-y-8">
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-600/10 blur-[60px] rounded-full" />

              <div className="flex items-center gap-3 mb-10 opacity-40">
                <FileText size={18} />
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  Transaction Summary
                </span>
              </div>

              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-500 uppercase">
                    신청 트랜잭션 ID
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-200">
                    {txData.id}
                  </p>
                </div>

                <div className="pt-8 space-y-6 border-t border-white/5">
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase">
                      정산 신청 금액
                    </p>
                    <h3 className="mt-1 text-2xl font-black">
                      {txData.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{" "}
                      <span className="text-sm font-bold text-slate-500">
                        {txData.currency}
                      </span>
                    </h3>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase">
                      최종 정산 수령액
                    </p>
                    {/* 원화 소수점 제거 반영 */}
                    <h3 className="mt-1 text-3xl font-black tracking-tighter text-teal-400">
                      {Math.floor(txData.finalAmount).toLocaleString()}{" "}
                      <span className="text-sm">KRW</span>
                    </h3>
                  </div>
                </div>

                <div className="pt-8 space-y-4 border-t border-white/5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="uppercase text-slate-500">신청 일시</span>
                    <span className="text-slate-300">{txData.requestDate}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="uppercase text-slate-500">
                      지정 수취 은행
                    </span>
                    <span className="text-slate-300">신한은행 (****1234)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-100 flex items-start gap-4">
              <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <p className="text-[12px] font-bold text-amber-800 leading-relaxed">
                해외 송금은 은행 영업일 기준 평균 1~3일이 소요됩니다. 완료 시
                알림 센터를 통해 실시간으로 알려드립니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CommonLayout>
  );
};

export default RemittanceTracking;
