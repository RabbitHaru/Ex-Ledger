import React, { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
// 🌟 세련된 로고와 메뉴를 위한 아이콘 추가
import {
  Menu,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Activity,
  LayoutDashboard,
  BarChart2,
  UserCircle,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { fetchEventSource } from "@microsoft/fetch-event-source";

interface LayoutProps {
  children?: ReactNode;
}

const CommonLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotiPanel, setShowNotiPanel] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    "시스템 연결됨",
  ]);

  const location = useLocation();
  const token = localStorage.getItem("access_token");

  // 현재 경로에 따른 메뉴 활성화 체크
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!token) return;

    const abortController = new AbortController();

    const connectSSE = async () => {
      await fetchEventSource("/api/v1/notifications/subscribe", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: abortController.signal,
        onopen: async (response) => {
          if (response.ok && response.status === 200) {
            console.log("✅ 알림 서버 연결 성공");
          } else {
            console.error("❌ 알림 서버 연결 실패", response.status);
          }
        },
        onmessage: (event) => {
          if (event.event === "remittance_update") {
            const receivedMessage = event.data;
            setNotifications((prev) => [receivedMessage, ...prev].slice(0, 5));
          } else if (event.event === "connect") {
            // connection established event from Spring
          }
        },
        onerror: (err) => {
          console.error("❌ SSE 연결 오류", err);
          // throw Error to trigger retry, or return retry interval
          return 5000;
        },
      });
    };

    connectSSE();

    return () => {
      abortController.abort();
    };
  }, [token]);

  return (
    <div className="flex min-h-screen font-sans bg-slate-50/50 text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* 🌟 상단 내비게이션 바 (고급스러운 디자인 적용) */}
        <header className="sticky top-0 z-30 w-full h-20 px-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between h-full mx-auto max-w-7xl">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 transition-all text-slate-500 hover:bg-gray-100 rounded-xl"
                aria-label="메뉴 열기"
              >
                <Menu size={24} />
              </button>

              {/* 🌟 새로운 Ex-Ledger 로고: E 박스 대신 Activity 아이콘 적용 */}
              <Link to="/" className="flex items-center gap-3 group">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 transition-all rounded-full bg-teal-500/20 blur-lg group-hover:bg-teal-500/35" />
                  <div className="relative flex items-center justify-center w-10 h-10 transition-all duration-300 bg-teal-600 shadow-lg rounded-xl shadow-teal-100 group-hover:-rotate-12">
                    <Activity
                      className="text-white"
                      size={22}
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black leading-none tracking-tighter text-slate-800">
                    Ex-<span className="text-teal-600">Ledger</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.25em] mt-1">
                    Fintech Solutions
                  </span>
                </div>
              </Link>
            </div>

            {/* 🌟 중앙 메뉴: 정산 요약 대신 실무 중심 명칭으로 변경 */}
            <nav className="items-center hidden gap-8 text-[13px] font-black md:flex">
              <Link
                to="/"
                className={`flex items-center gap-2 transition-colors ${isActive("/")
                  ? "text-teal-600"
                  : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <BarChart2 size={16} /> 실시간 환율
              </Link>
              <Link
                to="/seller/dashboard"
                className={`flex items-center gap-2 transition-colors ${isActive("/seller/dashboard")
                  ? "text-teal-600"
                  : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <LayoutDashboard size={16} /> 셀러 대시보드
              </Link>
            </nav>

            <div className="relative flex items-center gap-4">
              {/* 알림 버튼 */}
              <div className="relative">
                <button
                  onClick={() => setShowNotiPanel(!showNotiPanel)}
                  className={`p-2.5 rounded-xl transition-all relative ${showNotiPanel
                    ? "bg-teal-50 text-teal-600 shadow-inner"
                    : "text-slate-400 hover:bg-slate-50"
                    }`}
                >
                  <Bell size={22} />
                  {notifications.length > 0 && (
                    <span className="absolute w-2 h-2 bg-red-500 border-2 border-white rounded-full top-2.5 right-2.5"></span>
                  )}
                </button>

                {/* 알림 드롭다운 */}
                {showNotiPanel && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between p-5 border-b border-slate-50 bg-slate-50/30">
                      <h3 className="text-sm font-black text-slate-800">
                        최근 알림
                      </h3>
                      <button
                        onClick={() => setShowNotiPanel(false)}
                        className="p-1 rounded-lg hover:bg-slate-100"
                      >
                        <X size={16} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((msg, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-5 transition-colors border-b border-slate-50 hover:bg-slate-50"
                          >
                            <div className="mt-0.5">
                              {msg.includes("COMPLETED") ? (
                                <CheckCircle
                                  size={16}
                                  className="text-teal-500"
                                />
                              ) : msg.includes("DISCREPANCY") ? (
                                <AlertCircle
                                  size={16}
                                  className="text-red-500"
                                />
                              ) : (
                                <Clock size={16} className="text-amber-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-700 leading-snug">
                                {msg === "WAITING_USER_CONSENT"
                                  ? "정산 금액 확인 및 동의가 필요합니다."
                                  : msg}
                              </p>
                              <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase">
                                Just Now
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <p className="text-xs font-bold text-slate-300">
                            새 알림이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      className="w-full py-4 text-[11px] font-black text-slate-400 hover:text-teal-600 bg-white border-t border-slate-50 transition-colors"
                      onClick={() => setNotifications([])}
                    >
                      모든 알림 지우기
                    </button>
                  </div>
                )}
              </div>

              {/* 사용자 버튼 */}
              <div className="h-6 w-[1px] bg-slate-100 mx-1" />
              {token ? (
                <div className="flex items-center gap-2">
                  <Link to="/mypage">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-2xl text-[12px] font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                      <UserCircle size={18} className="text-slate-400" />
                      마이페이지
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem("access_token");
                      window.location.href = "/";
                    }}
                    className="flex items-center gap-2 pl-2 pr-4 py-2 bg-slate-800 text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 active:scale-95"
                  >
                    <UserCircle size={20} className="text-slate-400" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link to="/login">
                  <button className="px-6 py-2.5 text-[12px] font-black text-white bg-teal-600 rounded-2xl shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all active:scale-95">
                    로그인 / 시작하기
                  </button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-grow">{children ? children : <Outlet />}</main>

        {/* 푸터 영역 (고급스럽게 다듬음) */}
        <footer className="px-6 py-16 bg-slate-900 text-slate-500">
          <div className="flex flex-col items-center gap-8 mx-auto max-w-7xl">
            <div className="flex items-center gap-2 opacity-30 grayscale invert">
              <Activity size={20} />
              <span className="text-lg font-black tracking-tighter">
                Ex-Ledger
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 opacity-40">
              {["ISO 27001", "PCI-DSS", "ISMS", "SOC2"].map((cert) => (
                <span
                  key={cert}
                  className="px-3 py-1 text-[10px] font-bold border rounded-full border-slate-700 uppercase tracking-widest"
                >
                  {cert}
                </span>
              ))}
            </div>

            <div className="space-y-4 text-center">
              <div className="flex flex-wrap justify-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-600">
                <a href="#" className="transition-colors hover:text-teal-500">
                  이용약관
                </a>
                <a
                  href="#"
                  className="transition-colors text-slate-400 hover:text-teal-500"
                >
                  개인정보처리방침
                </a>
                <a href="#" className="transition-colors hover:text-teal-500">
                  운영정책
                </a>
                <a href="#" className="transition-colors hover:text-teal-500">
                  공지사항
                </a>
              </div>
              <div className="pt-4 border-t border-slate-800/50">
                <p className="text-[11px] font-medium leading-relaxed">
                  Ex-Ledger Co., Ltd. | 대표이사: 홍길동 | 사업자등록번호:
                  000-00-00000
                  <br />
                  서울특별시 강남구 테헤란로 핀테크 타워 22층
                </p>
                <p className="text-[10px] text-slate-700 mt-4 font-bold uppercase tracking-widest">
                  © 2026 Ex-Ledger. All rights reserved. Secure Global
                  Settlement System.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CommonLayout;
