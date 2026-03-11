import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthToken, parseJwt } from "../../utils/auth";
import { useWallet } from "../../context/WalletContext"; // 🌟 전역 데이터 구독
import {
  LayoutDashboard,
  X,
  Building2,
  SendHorizontal,
  Activity,
  BarChart2,
  History,
  ArrowDownLeft,
  Wallet,
  Copy,
  Users,
  ShieldAlert,
  RefreshCcw,
  CreditCard,
  ArrowRightLeft,
  Coins,
} from "lucide-react";
import { useToast } from "../notification/ToastProvider";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { showToast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  // 🌟 WalletContext에서 잔액 및 초기화 로직 구독
  const { hasAccount, userAccount, balances, resetAccount } = useWallet();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.auth) {
        setUserRole(decoded.auth);
      }
    }
  }, []);

  const hasRole = (role: string) => {
    if (!userRole) return false;
    const cleanRole = role.replace("ROLE_", "");
    return userRole.includes(role) || userRole.includes(cleanRole);
  };

  // 🏛️ 금융 서비스 이용 가능 대상 (어드민 제외 일반/기업 유저)
  const isFinanceTarget =
    !hasRole("ROLE_INTEGRATED_ADMIN") &&
    (hasRole("ROLE_USER") ||
      hasRole("ROLE_COMPANY_USER") ||
      hasRole("ROLE_COMPANY_ADMIN"));

  const isActive = (path: string) => location.pathname === path;

  const copyAccount = () => {
    if (!userAccount) return;
    navigator.clipboard.writeText(userAccount);
    showToast("계좌번호가 복사되었습니다.", "SUCCESS");
  };

  // 🌟 잔액 오염 방지 로직 적용
  const safeKrwBalance = typeof balances.KRW === "number" ? balances.KRW : 0;

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* 🚀 로고 섹션 */}
      <div className="flex items-center justify-between p-8">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 group"
        >
          <div className="flex items-center justify-center transition-all bg-teal-600 shadow-lg w-9 h-9 rounded-xl shadow-teal-100 group-hover:-rotate-12">
            <Activity className="text-white" size={20} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-800">
              Ex-<span className="text-teal-600">Ledger</span>
            </h1>
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em] leading-none mt-1">
              Cross-border System
            </p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="p-2 transition-colors text-slate-300 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* 🧭 네비게이션 메뉴 */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <Link
          to="/"
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
        >
          <BarChart2 size={18} /> 실시간 환율 정보
        </Link>

        {isFinanceTarget && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-teal-600/50 uppercase tracking-widest italic">
                Financial Services
              </p>
            </div>

            {/* 🌟 [신규] 자산 관리: 충전 및 전체 내역 확인 */}
            <Link
              to="/wallet/overview"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/wallet/overview") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Wallet size={18} /> 자산 관리 (Wallet)
            </Link>

            {/* 🌟 [기능 중심] 개인/기업 거래 실행 */}
            <Link
              to="/seller/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/seller/dashboard") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <ArrowRightLeft size={18} /> 개인/기업 거래
            </Link>

            <Link
              to="/settlement"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/settlement") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Coins size={18} /> 정산 관리 (Settlement)
            </Link>

            <Link
              to="/seller/history"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/seller/history") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <History size={18} /> 거래 상세 내역
            </Link>
          </>
        )}

        {/* 🛠️ 시스템 관리자 전용 섹션 */}
        {hasRole("ROLE_INTEGRATED_ADMIN") && (
          <div className="mt-8 space-y-1">
            <div className="px-4 py-2 border-t border-slate-50">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">
                System Management
              </p>
            </div>
            <Link
              to="/admin/users"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm font-black text-slate-400 hover:bg-slate-50 rounded-xl"
            >
              <Users size={18} /> 사용자 관리
            </Link>
            <Link
              to="/admin/audit"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm font-black text-slate-400 hover:bg-slate-50 rounded-xl"
            >
              <ShieldAlert size={18} /> 시스템 감사
            </Link>
          </div>
        )}
      </nav>

      {/* 💳 하단 지갑 요약 카드 */}
      {isFinanceTarget && hasAccount && (
        <div className="p-6 m-4 bg-slate-900 rounded-[32px] text-white shadow-2xl space-y-4 overflow-hidden border border-white/5 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-500 rounded-lg">
                <CreditCard size={14} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
                Ex-Wallet
              </span>
            </div>
            <div className="flex gap-2">
              {/* 🌟 데이터 정화/세탁용 리셋 버튼 */}
              <button
                onClick={() => {
                  if (window.confirm("계좌 데이터를 초기화하시겠습니까?"))
                    resetAccount();
                }}
                className="transition-colors text-slate-500 hover:text-red-400"
                title="데이터 초기화"
              >
                <RefreshCcw size={14} />
              </button>
              <button
                onClick={copyAccount}
                className="transition-colors text-slate-500 hover:text-white"
                title="계좌번호 복사"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter uppercase truncate">
              {userAccount}
            </p>
            <h3 className="block font-sans text-xl italic font-black leading-tight tracking-tighter truncate">
              ₩ {safeKrwBalance.toLocaleString()}
            </h3>
          </div>

          {/* 🌟 [수정] 버튼 클릭 시 통합 자산 관리 페이지(/wallet/overview)로 이동 */}
          <Link
            to="/wallet/overview"
            onClick={onClose}
            className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Manage My Assets
          </Link>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
