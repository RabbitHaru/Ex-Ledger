import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken, parseJwt } from "../../config/auth";
import { useWallet } from "../../context/WalletContext";
import http from "../../config/http";
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
    Copy,
    CheckCircle,
    SendHorizontal,
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
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [isApproved, setIsApproved] = useState<boolean>(true);

    // 🌟 WalletContext에서 백엔드 동기화된 데이터 구독
    const {
        personalAccount,
        corporateAccount,
        personalBalances,
        corporateBalances,
        resetAccount,
        setBusinessNumber,
    } = useWallet();

    // 🌟 [B담당 로직 결합] 프로필 정보를 가져와서 권한 및 상태 동기화
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await http.get("/auth/me");
                const data = response.data.data;
                setUserRole(data.role);
                setIsApproved(data.isApproved);
                setCompanyName(data.companyName);
                if (data.businessNumber) setBusinessNumber(data.businessNumber);
            } catch (err) {
                // API 실패 시 JWT 파싱으로 대응 (C담당 Fallback 로직)
                const token = getToken();
                if (token) {
                    const decoded = parseJwt(token);
                    if (decoded && decoded.auth) setUserRole(decoded.auth);
                }
            }
        };
        fetchProfile();
    }, [setBusinessNumber]);

    const hasRole = (role: string) => userRole?.includes(role) || false;

    // 권한 플래그 설정
    const isFinanceUser = hasRole("ROLE_USER") || hasRole("ROLE_COMPANY_USER") || hasRole("ROLE_COMPANY_ADMIN");
    const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");
    const isCorpStaff = hasRole("ROLE_COMPANY_USER");
    const isCorporateMember = isCorpAdmin || isCorpStaff;
    const isSiteAdmin = hasRole("ROLE_INTEGRATED_ADMIN");

    const isActive = (path: string) => location.pathname === path;

    // 하단 요약 정보 계산
    const activeAccount = (isCorporateMember && corporateAccount) ? corporateAccount : personalAccount;
    const activeKrw = (isCorporateMember && corporateAccount)
        ? (corporateBalances?.KRW || 0)
        : (personalBalances?.KRW || 0);

    const copyAccount = () => {
        if (!activeAccount) return;
        navigator.clipboard.writeText(activeAccount);
        showToast("계좌번호가 복사되었습니다.", "SUCCESS");
    };

    return (
        <div
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col`}
        >
            {/* 로고 영역 */}
            <div className="flex items-center justify-between p-8">
                <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
                    <div className="flex items-center justify-center transition-all bg-teal-600 shadow-lg w-9 h-9 rounded-xl group-hover:-rotate-12">
                        <Activity className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase text-slate-800">
                            Ex-<span className="text-teal-600">Ledger</span>
                        </h1>
                        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-1 leading-none">
                            Cross-border System
                        </p>
                    </div>
                </Link>
                <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
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

                {/* 1. 개인/금융 서비스 (일반 유저 및 기업 유저 공통) */}
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
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/wallet/overview") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <Wallet size={18} /> 자산 관리 (Wallet)
                        </Link>
                        <Link
                            to="/seller/dashboard"
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/seller/dashboard") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <ArrowRightLeft size={18} /> 개인/기업 송금
                        </Link>
                        <Link
                            to="/settlement"
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/settlement") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <Coins size={18} /> 정산 관리 (Settlement)
                        </Link>
                        <Link
                            to="/seller/history"
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/seller/history") ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-50"}`}
                        >
                            <History size={18} /> 거래 상세 장부
                        </Link>

                        {/* 2. 기업 전용 서비스 영역 */}
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
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/corporate/wallet") ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50"}`}
                                >
                                    <Building2 size={18} /> 기업 계좌 관리
                                </Link>
                                {isCorpAdmin && (
                                    <Link
                                        to="/admin/company/pending"
                                        onClick={onClose}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl transition-all ${isActive("/admin/company/pending") ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50"}`}
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
                        <Link to="/client" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/client") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <Building2 size={18} /> 가맹점 수수료 관리
                        </Link>
                        <Link to="/admin/logs" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/logs") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <ShieldAlert size={18} /> 시스템 감사로그
                        </Link>
                        <Link to="/admin/list" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/list") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <History size={18} /> 전체 정산/환전 관리
                        </Link>
                        <Link to="/admin/license-approval" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/license-approval") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <CheckCircle size={18} /> 사업자등록증 승인
                        </Link>
                        <Link to="/remittance" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/remittance") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <SendHorizontal size={18} /> 자금 이체 프로세싱
                        </Link>
                        <Link to="/admin/broadcast" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 text-sm font-black rounded-xl ${isActive("/admin/broadcast") ? "bg-teal-50 text-teal-600" : "text-slate-400"}`}>
                            <Bell size={18} /> 공지 발송
                        </Link>
                    </>
                )}
            </nav>

            {/* 하단 계좌 요약 카드 (B담당 세련된 디자인 + C담당 동기화 로직) */}
            {isFinanceUser && !isSiteAdmin && (
                <div className="px-6 py-8 mt-auto border-t border-slate-50">
                    <div className="p-6 bg-slate-900 rounded-[32px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white/10 rounded-full blur-2xl transition-all duration-700 group-hover:bg-white/20" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                        <Wallet className="text-teal-400" size={16} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isCorporateMember ? (companyName || "Corporate Account") : "Personal Account"}
                  </span>
                                </div>
                                <button onClick={copyAccount} className="p-2 transition-colors bg-white/5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
                                    <Copy size={14} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                                    {isCorporateMember ? "기업 공금 계좌" : "내 가상 계좌"}
                                </p>
                                <p className="font-mono text-lg font-black tracking-tight text-white break-all">
                                    {activeAccount || "계좌 미발급"}
                                </p>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <div className="flex items-end justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Balance</span>
                                    <div className="text-right">
                                        <span className="text-2xl italic font-black text-white">₩ {activeKrw.toLocaleString()}</span>
                                        <span className="ml-1 text-[10px] font-bold text-teal-400 uppercase">KRW</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 데이터 초기화 버튼 */}
            <button
                onClick={resetAccount}
                className="p-4 text-[10px] font-black text-slate-300 hover:text-red-400 uppercase tracking-tighter transition-colors"
            >
                Reset All Wallet Data
            </button>
        </div>
    );
};

export default Sidebar;