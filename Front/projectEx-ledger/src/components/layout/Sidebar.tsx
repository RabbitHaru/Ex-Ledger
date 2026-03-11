import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken, parseJwt } from "../../config/auth";
import { useWallet } from "../../context/WalletContext";
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
  ShieldAlert,
  RefreshCcw,
  CreditCard,
  ArrowRightLeft,
  Coins,
  Users,
  CheckCircle,
  Bell,
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
  const [isApproved, setIsApproved] = useState<boolean>(true);

  // 🌟 WalletContext 데이터 구독
  const { hasAccount, userAccount, balances, resetAccount } = useWallet();

  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = parseJwt(token);
      if (decoded) {
        if (decoded.auth) setUserRole(decoded.auth);
        if (decoded.isApproved !== undefined) {
          setIsApproved(decoded.isApproved);
        }
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

  const safeKrwBalance = typeof balances.KRW === "number" ? balances.KRW : 0;

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* 로고 섹션 */}
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

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
        {/* 1. 공통 메뉴 */}
        <Link
          to="/"
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
        >
          <BarChart2 size={18} /> 실시간 환율 정보
        </Link>

        {/* 2 & 3. 금융 서비스 및 기업 관리 메뉴 병합 처리 */}
        {isFinanceTarget && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-teal-600/50 uppercase tracking-widest italic">
                Financial Services
              </p>
            </div>

            <Link
              to="/wallet/overview"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/wallet/overview") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Wallet size={18} /> 자산 관리 (Wallet)
            </Link>

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

            {/* 기업 관리자 전용 탭 (금융 서비스 블록 내부에 포함) */}
            {hasRole("ROLE_COMPANY_ADMIN") && (
              <Link
                to="/admin/company/pending"
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/company/pending") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
              >
                <Users size={18} /> 멤버 및 권한 관리
              </Link>
            )}
          </>
        )}

        {/* 4. 사이트 총괄 관리자 메뉴 */}
        {hasRole("ROLE_INTEGRATED_ADMIN") && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Site Management
              </p>
            </div>
            <Link
              to="/client"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/client") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <Building2 size={18} /> 가맹점 및 수수료 관리
            </Link>
            <Link
              to="/admin/logs"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/logs") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <ShieldAlert size={18} /> 감사로그
            </Link>
            <Link
              to="/admin/list"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/list") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <History size={18} /> 전체 정산/환전 내역 관리
            </Link>
            <Link
              to="/admin/license-approval"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/license-approval") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <CheckCircle size={18} /> 사업자등록증 승인 관리
            </Link>
            <Link
              to="/remittance"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/remittance") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <SendHorizontal size={18} /> 자금 이체 프로세싱
            </Link>
            <Link
              to="/admin/broadcast"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/broadcast") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <Bell size={18} /> 전체 공지 발송
            </Link>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
