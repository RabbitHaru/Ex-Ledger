import React, { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
// 알림 센터에 필요한 아이콘들을 추가합니다.
import { Menu, Bell, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

const CommonLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 알림 관련 상태 추가
  const [showNotiPanel, setShowNotiPanel] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    "시스템 연결됨",
  ]);

  const token = localStorage.getItem("access_token");

  // 전역 실시간 알림 구독 (SSE)
  useEffect(() => {
    const eventSource = new EventSource("/api/v1/notifications/subscribe");

    eventSource.addEventListener("connect", (e: any) => {
      console.log("✅ 알림 서버 연결 성공");
    });

    eventSource.addEventListener("remittance_update", (event: any) => {
      const receivedMessage = event.data;
      // 최신 알림 5개만 유지하도록 관리
      setNotifications((prev) => [receivedMessage, ...prev].slice(0, 5));
    });

    eventSource.onerror = (e) => {
      console.error("❌ SSE 연결 오류");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="flex min-h-screen font-sans bg-gray-50 text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* 상단 내비게이션 바 (Header) */}
        <header className="sticky top-0 z-30 w-full px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between mx-auto max-w-7xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 transition-all text-slate-600 hover:bg-gray-100 rounded-xl"
                aria-label="메뉴 열기"
              >
                <Menu size={24} />
              </button>

              <Link to="/" className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded shadow-lg shadow-teal-100">
                  <span className="text-xl font-bold text-white">E</span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tighter text-slate-800">
                  Ex-Ledger
                </h1>
              </Link>
            </div>

            

            {/* 우측 알림 및 사용자 버튼 세트 */}
            <div className="relative flex items-center gap-4">
              {/* 1. 글로벌 알림 벨 버튼 */}
              <div className="relative">
                <button
                  onClick={() => setShowNotiPanel(!showNotiPanel)}
                  className={`p-2.5 rounded-xl transition-all ${
                    showNotiPanel
                      ? "bg-teal-50 text-teal-600 shadow-inner"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Bell size={22} />
                  {notifications.length > 0 && (
                    <span className="absolute w-2 h-2 bg-red-500 border-2 border-white rounded-full top-2 right-2"></span>
                  )}
                </button>

                {/* 2. 알림 드롭다운 패널 */}
                {showNotiPanel && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-slate-50 bg-slate-50/30">
                      <h3 className="text-sm font-bold text-slate-800">
                        최근 알림
                      </h3>
                      <button onClick={() => setShowNotiPanel(false)}>
                        <X size={14} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((msg, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-4 transition-colors border-b border-slate-50 hover:bg-slate-50"
                          >
                            <div className="mt-0.5">
                              {msg.includes("COMPLETED") ? (
                                <CheckCircle
                                  size={15}
                                  className="text-teal-500"
                                />
                              ) : msg.includes("DISCREPANCY") ? (
                                <AlertCircle
                                  size={15}
                                  className="text-red-500"
                                />
                              ) : msg.includes("WAITING_USER_CONSENT") ? (
                                <Clock size={15} className="text-amber-500" />
                              ) : (
                                <Bell size={15} className="text-teal-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-700 leading-snug">
                                {msg === "WAITING_USER_CONSENT"
                                  ? "정산 금액 확인 및 동의가 필요합니다."
                                  : msg}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                                Just Now
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <p className="text-xs font-bold text-slate-300">
                            새 알림이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      className="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-teal-600 bg-white border-t border-slate-50 transition-colors"
                      onClick={() => setNotifications([])}
                    >
                      모든 알림 지우기
                    </button>
                  </div>
                )}
              </div>

              {/* 3. 로그인/로그아웃 버튼 */}
              <div>
                {token ? (
                  <button
                    onClick={() => {
                      localStorage.removeItem("access_token");
                      window.location.href = "/";
                    }}
                    className="px-5 py-2 text-sm font-bold text-white transition-all rounded-md shadow-sm bg-slate-600 hover:bg-slate-700"
                  >
                    로그아웃
                  </button>
                ) : (
                  <Link to="/login">
                    <button className="px-5 py-2 text-sm font-bold text-white transition-all bg-teal-700 rounded-md shadow-sm hover:bg-teal-800">
                      로그인/회원가입
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-grow">{children}</main>

        {/* 푸터 영역 (Footer) */}
        <footer className="px-6 py-12 bg-slate-900 text-slate-400">
          <div className="flex flex-col items-center gap-6 mx-auto max-w-7xl">
            <div className="flex gap-6 opacity-50 grayscale">
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                ISO 27001
              </span>
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                PCI-DSS
              </span>
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                ISMS
              </span>
            </div>

            <div className="space-y-2 text-center">
              <div className="flex justify-center gap-4 mb-4 text-xs font-medium">
                <a href="#" className="hover:text-white">
                  이용약관
                </a>
                <a href="#" className="font-bold hover:text-white">
                  개인정보처리방침
                </a>
                <a href="#" className="hover:text-white">
                  운영정책
                </a>
                <a href="#" className="hover:text-white">
                  공지사항
                </a>
              </div>
              <p className="text-xs">
                Ex-Ledger Co., Ltd. | 대표이사: 홍길동 | 사업자등록번호:
                000-00-00000
              </p>
              <p className="text-[10px] text-slate-600">
                © 2026 Ex-Ledger. All rights reserved. 안전하고 투명한 글로벌
                정산 서비스를 제공합니다.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CommonLayout;
