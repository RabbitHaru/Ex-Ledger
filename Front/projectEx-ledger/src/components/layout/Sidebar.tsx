import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken, parseJwt } from "../../config/auth";
import { useWallet } from "../../context/WalletContext";
import http from "../../config/http";
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
  ShieldCheck,
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
  const [businessNumber, setBusinessNumber] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // 🌟 WalletContext 데이터 구독
  const { 
    hasAccount, 
    userAccount, 
    balances, 
    resetAccount, 
    getWalletDataById, 
    setBusinessNumber: setWalletBNo,
    personalAccount,
    corporateAccount,
    personalBalances,
    corporateBalances
  } = useWallet();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await http.get("/auth/me");
        const data = response.data.data;
        setUserRole(data.role);
        setIsApproved(data.isApproved);
        setBusinessNumber(data.businessNumber);
        setWalletBNo(data.businessNumber); // WalletContext에 사업자 번호 동기화
        setCompanyName(data.companyName);
      } catch (err) {
        // Fallback to JWT if API fails
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
      }
    };
    fetchProfile();
  }, [setWalletBNo]);

  const hasRole = (role: string) => {
    if (!userRole) return false;
    return userRole.includes(role);
  };

  const isCorporate = hasRole("ROLE_COMPANY_USER") || hasRole("ROLE_COMPANY_ADMIN");
  const isCorporateApproved = isCorporate && isApproved;
  const isFinanceTarget = !hasRole("ROLE_INTEGRATED_ADMIN") && (hasRole("ROLE_USER") || isCorporate);

  // 현재 활성 계좌 결정 (동기화 로직)
  const activeAccountId = isCorporateApproved ? businessNumber : (parseJwt(getToken() || '')?.sub || '');
  const walletData = getWalletDataById(activeAccountId || '');
  
  const currentAccount = isCorporate 
    ? (walletData?.userAccount || corporateAccount) 
    : (walletData?.userAccount || personalAccount || userAccount);
    
  const currentBalances = isCorporate 
    ? (walletData?.balances || corporateBalances) 
    : (walletData?.balances || personalBalances || balances);

  const isActive = (path: string) => location.pathname === path;

  const copyAccount = () => {
    if (!currentAccount) return;
    navigator.clipboard.writeText(currentAccount);
    showToast("계좌번호가 복사되었습니다.", "SUCCESS");
  };

  const safeKrwBalance = typeof currentBalances.KRW === "number" ? currentBalances.KRW : 0;

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* 로고 섹션 */}
      <div className="flex items-center justify-between p-8">
        <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
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
        <button onClick={onClose} className="p-2 transition-colors text-slate-300 hover:text-slate-600">
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

        {/* 🌟 실시간 환전 메뉴 (신규 추가) */}
        {isFinanceTarget && (
          <Link
            to="/exchange"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/exchange") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
          >
            <ArrowRightLeft size={18} /> 실시간 환전
          </Link>
        )}

        {/* 2 & 3. 금융 서비스 및 기업 관리 메뉴 분리 처리 */}
        {isFinanceTarget && (
          <>
            <div className="px-4 pt-10 pb-2 mt-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-teal-600/50 uppercase tracking-widest italic">
                {isCorporate ? "Corporate Management" : "Financial Services"}
              </p>
            </div>

            {hasRole("ROLE_USER") && (
              <Link
                to="/wallet/overview"
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/wallet/overview") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
              >
                <Wallet size={18} /> 자산 관리 (Wallet)
              </Link>
            )}

            {isCorporate && (
              <Link
                to="/corporate/wallet"
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/corporate/wallet") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
              >
                <Building2 size={18} /> 기업 계좌 관리
              </Link>
            )}

            <Link
              to="/seller/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/seller/dashboard") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <SendHorizontal size={18} /> {isCorporate ? "기업 송금" : "개인/기업 송금"}
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
              to="/dashboard"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/dashboard") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <LayoutDashboard size={18} /> 정산 요약 대시보드
            </Link>
            <Link
              to="/admin/grade-policy"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/grade-policy") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <ShieldCheck size={18} /> 등급별 수수료 정책 관리
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
              to="/admin/broadcast"
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-black transition-all rounded-xl ${isActive("/admin/broadcast") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
            >
              <Bell size={18} /> 전체 공지 발송
            </Link>
          </>
        )}
      </nav>

      {/* 계좌 정보 카드 */}
      {isFinanceTarget && (
        <div className="px-6 py-8 mt-auto border-t border-slate-50">
          <div className="p-6 bg-slate-900 rounded-[32px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 transition-all duration-700 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20" />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                    <Wallet className="text-teal-400" size={16} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isCorporate ? (companyName || "Corporate Account") : "Personal Account"}
                  </span>
                </div>
                <button onClick={copyAccount} disabled={!currentAccount} className="p-2 transition-colors bg-white/5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
                  <Copy size={14} />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                  {isCorporate ? "기업 공금 계좌" : "내 가상 계좌"}
                </p>
                <p className="font-mono text-lg font-black tracking-tight text-white truncate text-ellipsis overflow-hidden">
                  {currentAccount || "계좌 미발급"}
                </p>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-end justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Balance</span>
                  <div className="text-right">
                    <span className="text-2xl italic font-black text-white">₩ {safeKrwBalance.toLocaleString()}</span>
                    <span className="ml-1 text-[10px] font-bold text-teal-400 uppercase">KRW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* 데이터 초기화 버튼 */}
          <button
              onClick={resetAccount}
              className="w-full mt-4 p-2 text-[10px] font-black text-slate-300 hover:text-red-400 uppercase tracking-tighter transition-colors text-center"
          >
              Reset All Wallet Data
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;