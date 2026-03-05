import React, { useState, useEffect } from "react";
import ExchangeRateChart from "../../widgets/finance/ExchangeRateChart";
import AccountVerification from "./AccountVerification";
import RemittanceTracking from "./Tracking/RemittanceTracking";
import RemittanceRequestModal from "./RemittanceRequestModal";
import RemittanceConsentModal from "./RemittanceConsentModal";
import { ArrowUpRight, Wallet, History, Bell, AlertCircle } from "lucide-react";

type RemittanceStatus =
  | "WAITING"
  | "DISCREPANCY"
  | "WAITING_USER_CONSENT"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

const SellerDashboard = () => {
  const [currentStatus, setCurrentStatus] =
    useState<RemittanceStatus>("WAITING");
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");

  const handleVerificationSuccess = (ownerName: string) => {
    setVerifiedName(ownerName);
  };

  useEffect(() => {
    const eventSource = new EventSource(
      "http://localhost:8080/api/v1/notifications/subscribe",
    );

    eventSource.addEventListener("connect", (e: any) => {
      console.log("✅ 알림 서버 연결 성공:", e.data);
    });

    eventSource.addEventListener("remittance_update", (e: any) => {
      const newStatus = e.data as RemittanceStatus;
      const validStatuses: RemittanceStatus[] = [
        "WAITING",
        "DISCREPANCY",
        "WAITING_USER_CONSENT",
        "PENDING",
        "COMPLETED",
        "FAILED",
      ];

      if (validStatuses.includes(newStatus)) {
        setCurrentStatus(newStatus);
      }
      setNotifications((prev) => [e.data, ...prev].slice(0, 5));
    });

    eventSource.onerror = (e) => {
      console.error("❌ SSE 연결 오류", e);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      <div className="flex flex-col justify-between gap-4 mb-10 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            셀러 전용 대시보드
          </h1>
          <p className="mt-1 font-medium text-gray-500">
            실시간 환율 기반 정산 및 송금 현황을 관리하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-3 text-gray-600 transition-all bg-white border border-gray-200 rounded-2xl hover:bg-gray-50">
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full top-2 right-2 animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 font-bold text-white transition-all bg-blue-600 shadow-lg rounded-2xl hover:bg-blue-700 shadow-blue-100"
          >
            <ArrowUpRight size={18} /> 새 송금 신청
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-[450px]">
            <ExchangeRateChart selectedCurrency="USD" />
          </div>
          <AccountVerification
            onVerificationSuccess={handleVerificationSuccess}
          />
        </div>

        <div className="space-y-8">
          {currentStatus === "WAITING_USER_CONSENT" && (
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-[24px] flex flex-col gap-4 animate-in slide-in-from-right-5">
              <div className="flex items-center gap-3">
                <div className="p-2 text-white rounded-lg bg-amber-500">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-900">
                    정산 금액 수정됨
                  </p>
                  <p className="text-[11px] font-bold text-amber-700 opacity-80 leading-tight">
                    관리자가 오차를 확인하여 금액을 수정했습니다. 확인이
                    필요합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConsentModalOpen(true)}
                className="w-full py-3 text-xs font-black text-white transition-all shadow-lg bg-amber-500 rounded-xl hover:bg-amber-600 shadow-amber-100"
              >
                수정 금액 확인 및 동의
              </button>
            </div>
          )}

          <RemittanceTracking
            status={currentStatus}
            transactionId="TRX-20260305-88A2"
            updatedAt="2026-03-05 12:00"
          />

          <div className="bg-gray-900 p-8 rounded-[32px] text-white shadow-xl transition-transform hover:scale-[1.02]">
            <div className="flex items-center gap-3 mb-6 opacity-70">
              <Wallet size={20} />
              <span className="text-sm font-bold">정산 예정 금액</span>
            </div>
            <div className="mb-8">
              <h2 className="mb-2 text-4xl font-black">$ 12,450.00</h2>
              <p className="text-sm font-bold text-blue-400">
                ≈ 18,142,500 KRW
              </p>
            </div>
            <button className="flex items-center justify-center w-full gap-2 py-4 text-sm font-bold transition-all bg-white/10 hover:bg-white/20 rounded-2xl">
              <History size={16} /> 정산 내역 상세보기
            </button>
          </div>
        </div>
      </div>

      <RemittanceRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReceiverName={verifiedName}
      />

      <RemittanceConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        transactionId="TRX-20260305-88A2"
        initialReceiverName={verifiedName} 
        adjustedAmount={18130000}
        onSuccess={() => setCurrentStatus("PENDING")}
      />
    </div>
  );
};

export default SellerDashboard;
