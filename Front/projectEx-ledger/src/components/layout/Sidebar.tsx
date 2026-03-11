import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthToken, parseJwt } from "../../utils/auth";
import { useWallet } from "../../context/WalletContext";
import {
  X,
  Building2,
  Activity,
  BarChart2,
  History,
  Wallet,
  ShieldAlert,
  ArrowRightLeft,
  Users,
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
  
  // WalletContext에서 백엔드 동기화된 데이터 구독
  const {
    personalAccount,
    corporateAccount,
    personalBalances,
    corporateBalances,
    resetAccount,
  } = useWallet();

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.auth) setUserRole(decoded.auth);
    }
  }, []);

  // 🌟 권한 판단 로직 (원본의 로직을 그대로 계승)
  const hasRole = (role: string) => userRole?.includes(role) || false;
  
  const isFinanceUser =
    hasRole("ROLE_USER") ||
    hasRole("ROLE_COMPANY_USER") ||
    hasRole("ROLE_COMPANY_ADMIN");
  
  const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");
  const isCorpStaff = hasRole("ROLE_COMPANY_USER");
  const isCorporateMember = isCorpAdmin || isCorpStaff; // 기업 소속 멤버
  
  const isSiteAdmin = hasRole("ROLE_INTEGRATED_ADMIN");
  const isActive = (path: string) => location.pathname === path;

  // 🌟 하단 요약 정보: 기업 멤버라면 기업 계좌 정보를, 아니면 개인 정보를 표시
  const activeAccount = (isCorporateMember && corporateAccount) ? corporateAccount : personalAccount;
  const activeKrw = (isCorporateMember && corporateAccount) 
    ? (corporateBalances?.KRW || 0) 
    : (personalBalances?.KRW || 0);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
    >
      {/* 로고 영역 */}
      <div className="flex items-center justify-between p-8">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 group"
        >
          <div className="flex items-center justify-center transition-all bg-teal-600 shadow-lg w-9 h-9 rounded-xl group-hover:-rotate-12">
            <Activity className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-800">
              Ex-<span className="text-teal-600">Ledger</span>
            </h1>
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1">
              Cross-border System
            </p>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="p-2 text-slate-300 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <Link
          to="/"
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
        >
          <BarChart2 size={18} /> 실시간 환율 정보
        </Link>

        {/* 1. 개인/금융 서비스 영역 (일반 유저 및 기업 유저 공통) */}
        {isFinanceUser && !isSiteAdmin && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-teal-600/50 uppercase tracking-widest italic">
                Financial Services
              </p>
            </div>
            <Link
              to="/wallet/overview"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/wallet/overview") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <Wallet size={18} /> 자산 관리 (Wallet)
            </Link>
            <Link
              to="/seller/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/seller/dashboard") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <ArrowRightLeft size={18} /> 개인/기업 송금
            </Link>
            <Link
              to="/seller/history"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/seller/history") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <History size={18} /> 개인 거래 장부
            </Link>

            {/* 2. 기업 전용 서비스 영역 (관리자 + 직원 공통) */}
            {isCorporateMember && (
              <>
                <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
                  <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest italic">
                    Corporate Admin
                  </p>
                </div>
                <Link
                  to="/corporate/wallet"
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/corporate/wallet") ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  <Building2 size={18} /> 기업 계좌 관리
                </Link>
                
                {/* 🌟 조직 관리는 관리자만 노출 */}
                {isCorpAdmin && (
                  <Link
                    to="/admin/company/pending"
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/company/pending") ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50"}`}
                  >
                    <Users size={18} /> 멤버 및 권한 관리
                  </Link>
                )}
              </>
            )}
          </>
        )}

        {/* 3. 통합 관리자 영역 (ROLE_INTEGRATED_ADMIN) */}
        {isSiteAdmin && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Site Management
              </p>
            </div>
            <Link
              to="/client"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/client") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}
            >
              <Building2 size={18} /> 가맹점 및 수수료 관리
            </Link>
            <Link
              to="/admin/logs"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/logs") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}
            >
              <ShieldAlert size={18} /> 감사로그
            </Link>
            <Link
              to="/admin/list"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/list") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}
            >
              <History size={18} /> 전체 정산/환전 관리
            </Link>
            <Link
              to="/admin/broadcast"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/broadcast") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}
            >
              <Bell size={18} /> 공지 발송
            </Link>
          </>
        )}
      </nav>

      {/* 하단 계좌 요약 정보 */}
      {!!activeAccount && (
        <div className="p-6 m-4 bg-slate-50 rounded-[32px] space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {activeAccount.includes("2003") ? "Corporate Shared ID" : "Personal ID"}
          </p>
          <p className="font-mono text-xs font-bold break-all text-slate-800">
            {activeAccount}
          </p>
          <div className="flex items-end justify-between pt-2 border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-300 uppercase">
              Balance
            </p>
            <p className="text-sm italic font-black text-slate-900">
              ₩ {activeKrw.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* 데이터 초기화 버튼 (로그아웃 대응 가능) */}
      <button
        onClick={resetAccount}
        className="p-4 text-[10px] font-black text-slate-300 hover:text-red-400 uppercase tracking-tighter"
      >
        Reset All Wallet Data
      </button>
    </div>
  );
};

export default Sidebar;