import React from "react";
import {
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  ShieldCheck,
  Info,
} from "lucide-react";

type StatusType =
  | "WAITING"
  | "DISCREPANCY"
  | "WAITING_USER_CONSENT"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

interface TrackingProps {
  status: StatusType;
  transactionId?: string;
  updatedAt?: string;
}

const RemittanceTracking: React.FC<TrackingProps> = ({
  status,
  transactionId,
  updatedAt,
}) => {
  const steps = [
    {
      key: "WAITING",
      label: "승인 대기",
      errorLabel: "오차 발생",
      icon: <ShieldCheck size={20} />,
    },
    {
      key: "PENDING",
      label: "송금 대기",
      errorLabel: "동의 대기",
      icon: <Clock size={20} />,
    },
    {
      key: "COMPLETED",
      label: "정산 완료",
      errorLabel: "송금 실패",
      icon: <CheckCircle size={20} />,
    },
  ];

  const getActiveStep = () => {
    switch (status) {
      case "WAITING":
      case "DISCREPANCY":
        return 0;
      case "WAITING_USER_CONSENT":
      case "PENDING":
        return 1;
      case "COMPLETED":
      case "FAILED":
        return 2;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStep();

  const isError = status === "DISCREPANCY" || status === "FAILED";
  const isWarning = status === "WAITING_USER_CONSENT";

  return (
    <div className="w-full p-8 bg-white border border-gray-100 shadow-xl rounded-[32px]">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-xl font-black tracking-tight text-gray-800">
            송금 진행 현황
          </h3>
          <p className="mt-1 text-sm font-medium text-gray-400">
            거래번호:{" "}
            <span className="text-gray-600">
              {transactionId || "TRX-000000"}
            </span>
          </p>
        </div>

        {isError && (
          <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-red-600 rounded-full bg-red-50 border border-red-100 animate-pulse">
            <AlertCircle size={14} />
            {status === "DISCREPANCY" ? "오차 발생" : "송금 실패"}
          </div>
        )}
        {isWarning && (
          <div className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-amber-600 rounded-full bg-amber-50 border border-amber-100">
            <Info size={14} />
            유저 동의 대기
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between w-full px-2">
        <div className="absolute left-0 w-full h-1.5 bg-gray-50 top-[19px] -z-0 rounded-full"></div>
        <div
          className={`absolute left-0 h-1.5 transition-all duration-1000 top-[19px] -z-0 rounded-full ${
            isError ? "bg-red-500" : "bg-blue-600"
          }`}
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isCompleted =
            index < activeIndex ||
            (status === "COMPLETED" && index === activeIndex);
          const isActive = index === activeIndex;
          const hasErrorHere = isActive && isError;
          const hasWarningHere = isActive && isWarning;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  hasErrorHere
                    ? "bg-red-500 text-white shadow-lg shadow-red-100"
                    : hasWarningHere
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-100"
                      : isCompleted
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : isActive
                          ? "bg-white border-4 border-blue-600 text-blue-600 scale-110"
                          : "bg-white border-2 border-gray-100 text-gray-200"
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`mt-4 text-[11px] font-black tracking-tighter ${
                  hasErrorHere
                    ? "text-red-500"
                    : hasWarningHere
                      ? "text-amber-600"
                      : isActive
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-gray-800"
                          : "text-gray-400"
                }`}
              >
                {hasErrorHere ? step.errorLabel : step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-16 pt-6 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
        <span>Last Update: {updatedAt || "Just now"}</span>
        <button className="flex items-center gap-1 px-3 py-1.5 transition-colors rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500">
          Details
        </button>
      </div>
    </div>
  );
};

export default RemittanceTracking;
