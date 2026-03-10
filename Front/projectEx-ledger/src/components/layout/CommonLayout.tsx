// src/components/layout/CommonLayout.tsx

import React, { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Info,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { useToast } from "../notification/ToastProvider";

interface LayoutProps {
  children: ReactNode;
}

const CommonLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotiPanel, setShowNotiPanel] = useState(false);
  const {
    notificationHistory,
    showToast,
    removeNotification,
    clearAllNotifications,
  } = useToast();
  const location = useLocation();
  const token = localStorage.getItem("access_token");
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/notifications/subscribe");
    eventSource.addEventListener("remittance_update", (event: any) => {
      showToast(event.data, "INFO");
    });
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [showToast]);

  return (
    <div className="flex min-h-screen overflow-x-hidden font-sans bg-slate-50/50 text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="relative flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-50 w-full h-20 px-6 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between h-full mx-auto max-w-7xl">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-500 hover:bg-gray-100 rounded-xl"
              >
                <Menu size={24} />
              </button>
              <Link to="/" className="flex items-center gap-3 group">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-600 shadow-lg rounded-xl">
                  <Activity className="text-white" size={22} strokeWidth={3} />
                </div>
                <span className="text-2xl font-black text-slate-800">
                  Ex-<span className="text-teal-600">Ledger</span>
                </span>
              </Link>
            </div>

            <nav className="items-center hidden gap-8 text-[13px] font-black md:flex">
              <Link
                to="/"
                className={
                  isActive("/")
                    ? "text-teal-600"
                    : "text-slate-400 hover:text-slate-600"
                }
              >
                실시간 환율
              </Link>
              <Link
                to="/seller/dashboard"
                className={
                  isActive("/seller/dashboard")
                    ? "text-teal-600"
                    : "text-slate-400 hover:text-slate-600"
                }
              >
                셀러 대시보드
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowNotiPanel(!showNotiPanel)}
                  className={`p-2.5 rounded-xl transition-all relative ${showNotiPanel ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  <Bell size={22} />
                  {notificationHistory.length > 0 && (
                    <span className="absolute w-2 h-2 bg-red-500 border-2 border-white rounded-full top-2.5 right-2.5 animate-pulse" />
                  )}
                </button>

                {showNotiPanel && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-4 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between p-6 bg-white border-b border-slate-50">
                      <h3 className="text-sm font-black text-slate-800">
                        최근 알림
                      </h3>
                      <button
                        onClick={() => setShowNotiPanel(false)}
                        className="p-1 rounded-lg hover:bg-slate-50"
                      >
                        <X size={16} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto bg-white custom-scrollbar">
                      {notificationHistory.length > 0 ? (
                        notificationHistory.map((notif) => (
                          <div
                            key={notif.id}
                            className="relative flex items-start gap-4 p-5 border-b border-slate-50 hover:bg-slate-50 group"
                          >
                            <div
                              className={`mt-1 shrink-0 ${notif.type === "SUCCESS" ? "text-teal-500" : "text-amber-500"}`}
                            >
                              {notif.type === "SUCCESS" ? (
                                <CheckCircle size={18} />
                              ) : (
                                <Info size={18} />
                              )}
                            </div>
                            <div className="flex-1 pr-10">
                              <p className="text-[12px] font-bold text-slate-700 leading-snug">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-slate-300">
                                <Clock size={10} />
                                <p className="text-[9px] font-black uppercase">
                                  {notif.time || "Just Now"}
                                </p>
                              </div>
                            </div>

                            {/* 개별 삭제 버튼 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeNotification(notif.id);
                              }}
                              className="absolute top-5 right-4 w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all z-[60]"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-16 text-center">
                          <Bell
                            size={32}
                            className="mx-auto mb-3 text-slate-100"
                          />
                          <p className="text-xs font-bold text-slate-300">
                            새로운 알림이 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                    {notificationHistory.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllNotifications(); //
                        }}
                        className="w-full py-4 text-[11px] font-black text-slate-400 hover:text-red-600 bg-white border-t border-slate-50 transition-colors"
                      >
                        모든 알림 지우기
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="h-6 w-[1px] bg-slate-100 mx-1" />
              <button
                onClick={() => {
                  localStorage.removeItem("access_token");
                  window.location.href = "/";
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-2xl text-[12px] font-black shadow-lg shadow-slate-200"
              >
                <UserCircle size={20} className="text-slate-400" /> 로그아웃
              </button>
            </div>
          </div>
        </header>
        <main className="flex-grow">{children}</main>
      </div>

      {showNotiPanel && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setShowNotiPanel(false)}
        />
      )}
    </div>
  );
};

export default CommonLayout;
