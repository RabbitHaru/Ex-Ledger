import React from "react";
import {
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

// 유저 정의 상태 반영
type StatusType =
  | "WAITING_APPROVAL"
  | "DISCREPANCY"
  | "WAITING_TRANSFER"
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
  // 🌟 3단계 스테퍼 정의
  const steps = [
    {
      key: "WAITING_APPROVAL",
      label: "승인 대기",
      errorLabel: "오차 발생",
      icon: <ShieldCheck size={20} />,
    },
    {
      key: "WAITING_TRANSFER",
      label: "송금 대기",
      errorLabel: "",
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
      case "WAITING_APPROVAL":
      case "DISCREPANCY":
        return 0;
      case "WAITING_TRANSFER":
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

  return (
    <div className="w-full p-8 bg-white border border-gray-100 shadow-xl rounded-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-gray-800">송금 진행 현황</h3>
          <p className="text-sm font-medium text-gray-400">
            거래번호: {transactionId || "TRX-000000"}
          </p>
        </div>
        {isError && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 rounded-full bg-red-50 animate-pulse">
            <AlertCircle size={14} />
            {status === "DISCREPANCY" ? "데이터 오차 발생" : "송금 실패"}
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between w-full px-4">
        <div className="absolute left-0 w-full h-1 bg-gray-100 top-5 -z-0"></div>
        <div
          className="absolute left-0 h-1 transition-all duration-1000 bg-blue-500 top-5 -z-0"
          style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isCompleted =
            index < activeIndex ||
            (status === "COMPLETED" && index === activeIndex);
          const isActive = index === activeIndex;
          const hasErrorAtThisStep = isActive && isError;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  hasErrorAtThisStep
                    ? "bg-red-500 text-white shadow-lg shadow-red-200"
                    : isCompleted
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : isActive
                        ? "bg-white border-4 border-blue-600 text-blue-600 scale-110"
                        : "bg-white border-2 border-gray-200 text-gray-300"
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`mt-3 text-xs font-bold ${hasErrorAtThisStep ? "text-red-500" : isActive ? "text-blue-600" : isCompleted ? "text-gray-800" : "text-gray-400"}`}
              >
                {hasErrorAtThisStep ? step.errorLabel : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RemittanceTracking;
