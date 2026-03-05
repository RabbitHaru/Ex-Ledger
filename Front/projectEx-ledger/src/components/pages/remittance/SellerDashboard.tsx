import React, { useState, useEffect } from "react";
import ExchangeRateChart from "../../widgets/finance/ExchangeRateChart";
import AccountVerification from "./AccountVerification";
import RemittanceTracking from "./Tracking/RemittanceTracking";
import RemittanceRequestModal from "./RemittanceRequestModal";
import { ArrowUpRight, Wallet, History, Bell } from "lucide-react";

// 송금 상태 타입 정의
type RemittanceStatus =
  | "REQUESTED"
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

const SellerDashboard = () => {
  // 상태 관리
  const [currentStatus, setCurrentStatus] =
    useState<RemittanceStatus>("PENDING");
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 열림 상태
  const [verifiedName, setVerifiedName] = useState(""); // 인증된 예금주 성명

  // 계좌 인증 성공 시 호출될 핸들러
  const handleVerificationSuccess = (ownerName: string) => {
    console.log("✅ 대시보드에서 수신된 인증 성명:", ownerName);
    setVerifiedName(ownerName);
  };

  useEffect(() => {
    // SSE(Server-Sent Events) 실시간 구독
    const eventSource = new EventSource(
      "http://localhost:8080/api/v1/notifications/subscribe",
    );

    eventSource.addEventListener("connect", (e: any) => {
      console.log("✅ 알림 서버와 실시간 통로 연결 성공:", e.data);
    });

    eventSource.addEventListener("remittance_update", (e: any) => {
      const newStatus = e.data as RemittanceStatus;
      if (
        ["REQUESTED", "PENDING", "COMPLETED", "FAILED", "REJECTED"].includes(
          newStatus,
        )
      ) {
        setCurrentStatus(newStatus);
      }
      setNotifications((prev) => [e.data, ...prev].slice(0, 5));
    });

    eventSource.onerror = (e) => {
      console.error("❌ SSE 연결 오류 발생", e);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      {/* 1. 상단 헤더 영역 */}
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

          {/* 버튼 클릭 시 송금 신청 모달 오픈 */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 font-bold text-white transition-all bg-blue-600 shadow-lg rounded-2xl hover:bg-blue-700 shadow-blue-100"
          >
            <ArrowUpRight size={18} /> 새 송금 신청
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 2. 좌측 영역 */}
        <div className="space-y-8 lg:col-span-2">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-[450px]">
            <ExchangeRateChart selectedCurrency="USD" />
          </div>

          <AccountVerification
            onVerificationSuccess={handleVerificationSuccess}
          />
        </div>

        {/* 3. 우측 영역 */}
        <div className="space-y-8">
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

      {/* 4. 송금 신청 모달 컴포넌트 */}
      <RemittanceRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReceiverName={verifiedName}
      />
    </div>
  );
};

export default SellerDashboard;
