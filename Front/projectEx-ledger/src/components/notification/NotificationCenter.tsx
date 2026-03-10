import React, { useEffect } from "react";
import { useToast } from "./ToastProvider";
import { Bell, Info, CheckCircle, AlertCircle, Clock, X } from "lucide-react";

const NotificationCenter: React.FC = () => {
  // 🌟 ToastProvider에서 내역(history)과 알림 함수를 모두 가져옵니다.
  const { showToast, notificationHistory } = useToast();

  useEffect(() => {
    // 실시간 서버 알림 구독 (SSE)
    const eventSource = new EventSource("/api/v1/notifications/subscribe");

    eventSource.addEventListener("remittance_update", (event: any) => {
      try {
        const data = event.data;
        let message = data;
        let type: "INFO" | "SUCCESS" | "ERROR" = "INFO";

        if (data.includes("COMPLETED")) {
          message = "해외 송금이 성공적으로 완료되었습니다.";
          type = "SUCCESS";
        } else if (data.includes("DISCREPANCY") || data.includes("FAILED")) {
          message = "송금 처리 중 오차가 발생했습니다.";
          type = "ERROR";
        }

        showToast(message, type);
      } catch (err) {
        console.error("SSE 데이터 파싱 에러:", err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [showToast]);

  // 🌟 UI 렌더링 시작
  return (
    <div className="bg-white w-80 rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* 헤더 섹션 */}
      <div className="flex items-center justify-between p-6 bg-white border-b border-slate-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-slate-800">최근 알림</h3>
          <span className="bg-teal-50 text-teal-600 text-[10px] font-black px-2 py-0.5 rounded-full">
            {notificationHistory.length}
          </span>
        </div>
      </div>

      {/* 알림 리스트 영역 */}
      <div className="max-h-[360px] overflow-y-auto custom-scrollbar bg-white">
        {notificationHistory.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="mx-auto mb-3 text-slate-100" />
            <p className="text-xs font-bold text-slate-300">
              새로운 알림이 없습니다.
            </p>
          </div>
        ) : (
          notificationHistory.map((notif) => (
            <div
              key={notif.id}
              className="flex gap-4 p-5 transition-colors border-b border-slate-50 hover:bg-slate-50 group"
            >
              {/* 타입별 아이콘 설정 */}
              <div
                className={`mt-1 shrink-0 ${
                  notif.type === "SUCCESS"
                    ? "text-teal-500"
                    : notif.type === "ERROR"
                      ? "text-red-500"
                      : "text-amber-500"
                }`}
              >
                {notif.type === "SUCCESS" && <CheckCircle size={18} />}
                {notif.type === "ERROR" && <AlertCircle size={18} />}
                {notif.type === "INFO" && <Info size={18} />}
              </div>

              {/* 메시지 내용 */}
              <div className="flex-1">
                <p className="text-[12px] font-bold text-slate-700 leading-snug group-hover:text-slate-900 transition-colors">
                  {notif.message}
                </p>
                <div className="flex items-center gap-1 mt-2 text-slate-300">
                  <Clock size={10} />
                  <p className="text-[9px] font-black uppercase tracking-tighter">
                    {notif.time || "JUST NOW"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 푸터 섹션 */}
      {notificationHistory.length > 0 && (
        <button className="w-full py-4 text-[11px] font-black text-slate-400 hover:text-teal-600 hover:bg-slate-50 transition-all border-t border-slate-50">
          모든 알림 지우기
        </button>
      )}
    </div>
  );
};

export default NotificationCenter;
