import React, { useState } from "react";
import axios from "axios";
import CommonLayout from "../../../components/layout/CommonLayout";
import { useWallet } from "../../../context/WalletContext";
import { hasRole, getAuthToken } from "../../../utils/auth";
import {
    Building2,
    Plus,
    Loader2,
    ShieldAlert,
    Download,
    ArrowUpRight,
    ArrowDownLeft,
    Copy,
    Search,
    Briefcase,
    Sparkles,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";

const CorporateWallet: React.FC = () => {
    const { showToast } = useToast();
    const {
        corporateBalances,
        transactions,
        corporateAccount,
        setCorporateAccount,
        chargeKrw,
        companyName,
    } = useWallet();

    const [isActivating, setIsActivating] = useState(false);
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");

    // 🌟 [C담당 실결합] 실제 기업 마스터 계좌 발급 API 호출
    const handleActivate = async () => {
        if (!isCorpAdmin) return;
        setIsActivating(true);
        try {
            const apiRes = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/wallet/corporate/activate`,
                {},
                { headers: { Authorization: `Bearer ${getAuthToken()}` } },
            );
            const { accountNumber, companyName: name } = apiRes.data;
            // Context 상태 업데이트
            setCorporateAccount(accountNumber, name);
            showToast(`${name} 마스터 계좌가 활성화되었습니다.`, "SUCCESS");
        } catch (err) {
            showToast("기업 계좌 활성화 실패. 관리자에게 문의하세요.", "ERROR");
        } finally {
            setIsActivating(false);
        }
    };

    const handleCharge = async () => {
        try {
            await chargeKrw(Number(chargeAmount), "BUSINESS");
            setIsChargeModalOpen(false);
            setChargeAmount("");
            showToast("기업 자금 충전 요청 성공!", "SUCCESS");
        } catch (err) {
            showToast("충전 처리 중 오류가 발생했습니다.", "ERROR");
        }
    };

    const handleCopyAccount = () => {
        if (corporateAccount) {
            navigator.clipboard.writeText(corporateAccount);
            showToast("계좌 번호가 복사되었습니다.", "SUCCESS");
        }
    };

    // 비즈니스 트랜잭션 필터링 및 검색 로직 (B담당 UX 반영)
    const businessTxs = transactions.filter(
        (tx) =>
            tx.category === "BUSINESS" &&
            tx.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 1. 계좌가 없을 때 (발급 신청 UI)
    if (!corporateAccount) {
        return (
            <CommonLayout>
                <div className="max-w-4xl px-6 py-32 mx-auto space-y-12 text-center animate-in fade-in">
                    <div className="space-y-6">
                        <div className="bg-indigo-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto text-indigo-600 shadow-xl shadow-indigo-100/50">
                            <Building2 size={48} />
                        </div>
                        <h1 className="text-4xl italic font-black tracking-tighter uppercase text-slate-900">
                            Corporate Wallet
                        </h1>
                        <p className="max-w-md mx-auto font-bold leading-relaxed text-slate-500">
                            {companyName ? `[${companyName}]` : "DB Syncing..."} 정보가 확인되었습니다. <br />
                            정산 관리를 위한 <strong className="text-indigo-600">기업 마스터 계좌</strong>를 활성화해 주세요.
                        </p>
                        {isCorpAdmin ? (
                            <button
                                onClick={handleActivate}
                                disabled={isActivating}
                                className="group relative px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                            >
                                {isActivating ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-indigo-400" />
                                        기업 마스터 계좌 즉시 발급
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-4 max-w-sm mx-auto">
                                <ShieldAlert size={32} className="mx-auto text-slate-300" />
                                <p className="text-[11px] font-bold leading-relaxed text-center text-slate-400 uppercase tracking-tighter">
                                    관리자(Admin)가 기업 계좌를 <br /> 활성화할 때까지 기다려 주세요.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CommonLayout>
        );
    }

    // 2. 계좌가 있을 때 (기업 대시보드 UI)
    return (
        <CommonLayout>
            <div className="p-8 mx-auto space-y-10 font-sans max-w-7xl animate-in fade-in bg-[#F8FAFC]">
                <header className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* 기업 정보 카드 */}
                    <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                  Corporate
                </span>
                                <span className="text-slate-400 text-[10px] font-bold italic">
                  사업자 전용 자산 관리
                </span>
                            </div>
                            <h2 className="text-4xl italic font-black uppercase text-slate-900 leading-none tracking-tighter">
                                {companyName}
                            </h2>
                            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                                <p>Verified <span className="ml-1 text-slate-900">Business Unit</span></p>
                                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                <p>Status <span className="ml-1 text-teal-600 uppercase">Active</span></p>
                            </div>
                        </div>
                        <Building2 size={120} className="absolute bottom-0 right-0 p-8 opacity-[0.05] text-slate-900" />
                    </div>

                    {/* 계좌 정보 카드 */}
                    <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
                                Master Account ID
                            </p>
                            <div className="flex items-center justify-between">
                                <h3 className="font-mono text-3xl italic font-bold tracking-tighter">
                                    {corporateAccount}
                                </h3>
                                <button onClick={handleCopyAccount} className="p-2 transition-colors bg-white/10 rounded-xl hover:bg-white/20">
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="relative z-10 flex items-end justify-between pt-6 border-t border-white/5">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance</p>
                                <p className="text-3xl italic font-black tracking-tighter">
                                    ₩ {corporateBalances.KRW?.toLocaleString() || 0}
                                </p>
                            </div>
                            {isCorpAdmin && (
                                <button
                                    onClick={() => setIsChargeModalOpen(true)}
                                    className="p-4 text-white transition-all bg-indigo-600 shadow-xl rounded-2xl hover:bg-indigo-500 active:scale-95 shadow-indigo-500/20"
                                >
                                    <Plus size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* 왼쪽: 트랜잭션 내역 */}
                    <section className="space-y-6 lg:col-span-8">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-1">
                                <h3 className="text-xl italic font-black tracking-tighter uppercase text-slate-900">
                                    Business Transactions
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raw Source Ledger</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-300" size={14} />
                                <input
                                    type="text"
                                    placeholder="거래 내역 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-500 w-64 shadow-sm transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[48px] shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">Date</th>
                                    <th className="px-10 py-6">Title</th>
                                    <th className="px-10 py-6 text-right">Amount</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                {businessTxs.length > 0 ? (
                                    businessTxs.map((tx) => (
                                        <tr key={tx.id} className="transition-colors hover:bg-slate-50/50 group">
                                            <td className="px-10 py-8 text-[11px] font-bold text-slate-400 font-mono italic">
                                                {tx.date}
                                            </td>
                                            <td className="flex items-center gap-4 px-10 py-8">
                                                <div className={`p-2 rounded-lg ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}>
                                                    {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <span className="text-sm italic font-black text-slate-800">{tx.title}</span>
                                            </td>
                                            <td className={`px-10 py-8 text-right font-black italic text-base ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}>
                                                {tx.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-32 text-xs italic font-black tracking-widest text-center uppercase text-slate-200">
                                            데이터를 찾을 수 없습니다.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 오른쪽: 사이드바 (B담당 Export 기능 연동) */}
                    <aside className="space-y-6 lg:col-span-4">
                        <div className="bg-indigo-600 rounded-[40px] p-10 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 transition-transform opacity-10 group-hover:scale-110">
                                <Download size={100} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-indigo-200">
                                Data Export Tool
                            </p>
                            <p className="mb-10 text-2xl italic font-black leading-tight tracking-tighter">
                                정산 및 보고를 위한 <br />Raw Data 추출
                            </p>
                            <button className="w-full py-5 text-xs font-black tracking-widest text-indigo-600 uppercase transition-all bg-white shadow-lg rounded-2xl hover:shadow-indigo-50 active:scale-95 flex items-center justify-center gap-2">
                                <Download size={14} /> CSV 내보내기
                            </button>
                        </div>
                    </aside>
                </div>
            </div>

            {/* 충전 모달 (C담당 로직 유지) */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center">
                        <h3 className="text-3xl italic font-black tracking-tighter uppercase text-slate-900">Corporate Deposit</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{companyName} 자산 충전</p>
                        <input
                            type="number"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            placeholder="0"
                            className="w-full pb-6 text-6xl italic font-black text-center border-b-4 outline-none border-slate-50 focus:border-indigo-500"
                            autoFocus
                        />
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsChargeModalOpen(false)} className="flex-1 py-6 text-xs font-black uppercase text-slate-400">Cancel</button>
                            <button onClick={handleCharge} className="flex-[2] bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95">Charge Now</button>
                        </div>
                    </div>
                </div>
            )}
        </CommonLayout>
    );
};

export default CorporateWallet;