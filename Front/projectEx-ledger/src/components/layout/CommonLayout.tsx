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
import { MfaHeaderTimer } from "./MfaHeaderTimer";
import { Github, LogOut } from "lucide-react";
import { MfaExpiryModal } from "./MfaExpiryModal";
import { logout as authLogout, parseJwt } from "../../config/auth";
import { useToast } from "../notification/ToastProvider";


interface LayoutProps {
  children?: ReactNode;
}

const CommonLayout: React.FC<LayoutProps> = ({ children }) => {
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotiPanel, setShowNotiPanel] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    "시스템 연결됨",
  ]);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);

  const location = useLocation();
  const token = localStorage.getItem("access_token");

  // 현재 경로에 따른 메뉴 활성화 체크
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (sessionStorage.getItem("logout_notice")) {
      sessionStorage.removeItem("logout_notice");
      showToast("로그아웃되었습니다. 메인페이지로 이동했습니다.", "INFO");
    }
  }, [showToast]);

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
            setNotifications((prev) => [`💸 ${event.data}`, ...prev].slice(0, 10));
          } else if (event.event === "login_alert") {
            setNotifications((prev) => [`🔐 ${event.data}`, ...prev].slice(0, 10));
          } else if (event.event === "announcement") {
            setNotifications((prev) => [`📢 ${event.data}`, ...prev].slice(0, 10));
          } else if (event.event === "connect") {
            // connection established event from Spring
          }
        },
        onerror: (err) => {
          console.error("❌ SSE 연결 오류", err);
          return 5000;
        },
      });
    };

    connectSSE();

    // MFA 세션 만료 이벤트 리스너
    const handleMfaExpired = () => setIsExpiryModalOpen(true);
    window.addEventListener('mfa-session-expired', handleMfaExpired);

    return () => {
      abortController.abort();
      window.removeEventListener('mfa-session-expired', handleMfaExpired);
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
                              {msg.startsWith("💸") ? (
                                <CheckCircle
                                  size={16}
                                  className="text-teal-500"
                                />
                              ) : msg.startsWith("🔐") ? (
                                <AlertCircle
                                  size={16}
                                  className="text-amber-500"
                                />
                              ) : msg.startsWith("📢") ? (
                                <Bell
                                  size={16}
                                  className="text-blue-500"
                                />
                              ) : (
                                <Clock size={16} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-700 leading-snug">
                                {msg}
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

              <MfaHeaderTimer />

              {/* 사용자 버튼 */}
              <div className="h-6 w-[1px] bg-slate-100 mx-1" />
              {token ? (
                <div className="flex items-center gap-2">
                  <Link to="/mypage">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 text-slate-600 rounded-2xl text-[12px] font-black hover:bg-slate-50 transition-all active:scale-95 shadow-sm h-10">
                      <UserCircle size={16} className="text-slate-400" />
                      마이페이지
                    </button>
                  </Link>
                  <button
                    onClick={() => authLogout(false)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 active:scale-95 h-10"
                  >
                    <LogOut size={16} className="text-slate-300" />
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

        <MfaExpiryModal 
            isOpen={isExpiryModalOpen} 
            onClose={() => setIsExpiryModalOpen(false)}
            onLogin={() => {
                setIsExpiryModalOpen(false);
                window.location.href = '/login-required';
            }}
        />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-grow">{children ? children : <Outlet />}</main>

        {/* 푸터 영역 (고밀도 컴팩트 프리미엄 레이아웃) */}
        <footer className="bg-white/90 backdrop-blur-xl text-slate-500 py-10 px-6 border-t border-slate-100 mt-auto shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.03)] font-sans">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">
              {/* 서비스 정체성 */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2.5 mb-4 font-black">
                  <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
                    <Activity className="text-white" size={20} strokeWidth={3} />
                  </div>
                  <span className="text-xl text-slate-900 tracking-tighter">Ex-<span className="text-teal-600">Ledger</span></span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-400 font-medium max-w-sm">
                  기업의 복잡한 정산 프로세스를 자동화하고 실시간 환율 기반의 안전한 자금 흐름을 보장하는 차세대 핀테크 플랫폼입니다.
                </p>
                <div className="flex gap-3 mt-6">
                  <a href="https://github.com/RabbitHaru/Ex-Ledger" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
                    <Github size={18} />
                  </a>
                </div>
              </div>

              {/* 핵심 기술 스택 (데이터 밀도 향상) */}
              <div>
                <h4 className="text-slate-900 font-black text-[11px] lg:text-[10px] uppercase tracking-widest mb-5 border-l-2 border-teal-500 pl-2">기술 스택</h4>
                <ul className="space-y-3 text-[12px] font-bold text-slate-600">
                  <li className="flex items-center gap-2 group cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 group-hover:scale-125 transition-transform" /> 
                    Spring Boot 4 / Java 17
                  </li>
                  <li className="flex items-center gap-2 group cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-125 transition-transform" /> 
                    React 18 / TypeScript
                  </li>
                  <li className="flex items-center gap-2 group cursor-default">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover:scale-125 transition-transform" /> 
                    Redis / MariaDB / AOP
                  </li>
                </ul>
              </div>

              {/* 연동 서비스 (데이터 밀도 향상) */}
              <div>
                <h4 className="text-slate-900 font-black text-[11px] lg:text-[10px] uppercase tracking-widest mb-5 border-l-2 border-blue-500 pl-2">연동 및 보안</h4>
                <ul className="space-y-2.5 text-[12px] font-bold text-slate-600">
                  <li className="flex items-center gap-2 hover:text-teal-600 transition-colors">
                    <CheckCircle size={13} className="text-teal-500" /> 
                    포트원 / KG 이니시스
                  </li>
                  <li className="flex items-center gap-2 hover:text-teal-600 transition-colors">
                    <CheckCircle size={13} className="text-teal-500" /> 
                    수출입은행(환율) / 국세청
                  </li>
                  <li className="flex items-center gap-2 hover:text-teal-600 transition-colors">
                    <CheckCircle size={13} className="text-blue-500" /> 
                    Google OTP / Cloudflare
                  </li>
                </ul>
              </div>

              {/* 개발 및 지원 */}
              <div>
                <h4 className="text-slate-900 font-black text-[11px] lg:text-[10px] uppercase tracking-widest mb-5 border-l-2 border-slate-300 pl-2">지원 및 도구</h4>
                <ul className="space-y-3 text-[12px] font-bold">
                  <li><Link to="/notice" className="text-slate-500 hover:text-teal-600 transition-colors">공지사항</Link></li>
                  <li><Link to="/terms" className="text-slate-500 hover:text-teal-600 transition-colors">이용약관</Link></li>
                  <li><Link to="/privacy" className="text-slate-500 hover:text-teal-600 transition-colors">개인정보처리방침</Link></li>
                  <li><Link to="/policy" className="text-slate-500 hover:text-teal-600 transition-colors">운영정책</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100/60 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col gap-1.5 text-center md:text-left">
                <p className="text-[11px] font-bold text-slate-400">
                  Ex-Ledger Co., Ltd. | 대표이사: 홍길동 | 사업자등록번호: 000-00-00000
                </p>
                <p className="text-[10px] font-medium text-slate-300">
                  서울특별시 강남구 테헤란로 22층 | 고객센터: support@ex-ledger.com
                </p>
              </div>
              <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {["ISO 27001", "ISMS", "SOC2"].map((cert) => (
                  <span key={cert} className="px-2.5 py-1 text-[9px] font-black border border-slate-200 rounded-lg text-slate-400 tracking-tighter shadow-sm bg-slate-50/50">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
            
            <p className="mt-8 text-[10px] text-slate-300 font-black uppercase tracking-[0.5em] text-center">
              © 2026 Ex-Ledger. Global Secure Settlement Infrastructure.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CommonLayout;
