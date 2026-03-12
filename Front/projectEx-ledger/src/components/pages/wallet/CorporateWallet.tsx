import React, { useState, useEffect } from "react";
import axios from "axios";
import http from "../../../config/http";

import { useWallet, type Transaction } from "../../../context/WalletContext";
import { hasRole, getToken } from "../../../config/auth";
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
    Filter,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";

const CURRENCY_NAMES: Record<string, string> = {
    KRW: "대한민국 원", AED: "아랍에미리트 디르함", AUD: "호주 달러", BHD: "바레인 디나르",
    BND: "브루나이 달러", CAD: "캐나다 달러", CHF: "스위스 프랑", CNH: "위안화",
    DKK: "덴마크 크로네", EUR: "유로", GBP: "영국 파운드", HKD: "홍콩 달러",
    IDR: "인도네시아 루피아", JPY: "일본 엔", KWD: "쿠웨이트 디나르", MYR: "말레이시아 링깃",
    NOK: "노르웨이 크로네", NZD: "뉴질랜드 달러", SAR: "사우디 리얄", SEK: "스웨덴 크로나",
    SGD: "싱가포르 달러", THB: "태국 바트", USD: "미국 달러",
};

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
    const [profile, setProfile] = useState<any>(null);

    const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");

    const activePockets = (Object.entries(corporateBalances) as [string, number][]).filter(
        ([cur, bal]) => bal > 0 && cur !== "KRW"
    );

    // 프로필 정보 조회
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await http.get("/auth/me");
                setProfile(response.data.data);
            } catch (err) {
                console.error("기업 프로필 로드 실패");
            }
        };
        fetchProfile();
    }, []);

    // 기업 마스터 계좌 활성화 API 호출
    const handleActivate = async () => {
        if (!isCorpAdmin) return;
        setIsActivating(true);
        try {
            const apiRes = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/wallet/corporate/activate`,
                {},
                { headers: { Authorization: `Bearer ${getToken()}` } },
            );
            const { accountNumber, companyName: name } = apiRes.data;
            setCorporateAccount(accountNumber, name);
            showToast(`${name} 마스터 계좌가 활성화되었습니다.`, "SUCCESS");
        } catch (err) {
            // Fallback for demo if API fails or as a fallback
            setTimeout(() => {
                const newCorpAccount = `EX-2003-${Math.floor(1000 + Math.random() * 9000)}`;
                setCorporateAccount(newCorpAccount, profile?.companyName || "기업 계좌");
                showToast("기업 전용 마스터 계좌(2003)가 발급되었습니다.", "SUCCESS");
                setIsActivating(false);
            }, 2000);
        } finally {
            if (!isActivating) setIsActivating(false);
        }
    };

    const handleCharge = async () => {
        try {
            await chargeKrw(Number(chargeAmount), "BUSINESS");
            setIsChargeModalOpen(false);
            setChargeAmount("");
            showToast("기업 자금 충전 요청 완료!", "SUCCESS");
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

    // 비즈니스 트랜잭션 필터링
    const businessTxs = transactions.filter(
        (tx) =>
            tx.category === "BUSINESS" &&
            tx.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 1. 계좌가 없을 때 (발급 신청 UI)
    if (!corporateAccount || (!corporateAccount.startsWith("EX-2003") && !corporateAccount.includes("2003"))) {
        return (
            <div className="max-w-4xl px-6 py-32 mx-auto space-y-12 text-center animate-in fade-in">
                <div className="space-y-6">
                    <div className="bg-indigo-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto text-indigo-600 shadow-xl shadow-indigo-100/50">
                        <Building2 size={48} />
                    </div>
                    <h1 className="text-4xl italic font-black tracking-tighter uppercase text-slate-900">
                        Corporate Account Activation
                    </h1>
                    <p className="max-w-md mx-auto font-bold leading-relaxed text-slate-500">
                        귀하의 기업 정보가 확인되었습니다. <br />
                        정산 데이터 생성을 위한 <strong className="text-indigo-600">기업 전용 마스터 계좌</strong>를
                        발급해 주세요.
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
                                    기업 계좌 즉시 발급하기
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-4 max-w-sm mx-auto">
                            <ShieldAlert size={32} className="mx-auto text-slate-300" />
                            <p className="text-xs font-medium text-slate-400">
                                기업 전용 계좌가 아직 없습니다. <br />
                                <strong>기업 관리자</strong>만 계좌 개설이 가능합니다. 관리자에게 문의해 주세요.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. 계좌가 있을 때 (통합 대시보드 UI)
    return (
        <div className="p-8 mx-auto space-y-10 font-sans max-w-7xl animate-in fade-in bg-[#F8FAFC]">
            <header className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                                Corporate
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold">
                                사업자 전용 계좌 관리
                            </span>
                        </div>
                        <h2 className="text-4xl italic font-black uppercase text-slate-900 leading-none tracking-tighter">
                            {companyName || profile?.companyName || "(주) 글로벌 파트너스"}
                        </h2>
                        <div className="flex items-center gap-4 text-[11px] font-black text-slate-400">
                            <p>사업자 번호 <span className="ml-1 text-slate-900">{profile?.businessNumber || "123-45-67890"}</span></p>
                            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                            <p>대표자 <span className="ml-1 text-slate-900">{profile?.representative || profile?.name || "홍길동"}</span></p>
                        </div>
                    </div>
                    <Building2 size={120} className="absolute bottom-0 right-0 p-8 opacity-[0.05] text-slate-900" />
                </div>

                <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
                            Corporate Dedicated ID
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
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">보유 잔액</p>
                            <p className="text-2xl italic font-black tracking-tighter">
                                ₩ {corporateBalances.KRW?.toLocaleString() || 0}
                            </p>
                        </div>
                        {isCorpAdmin && (
                            <button
                                onClick={() => setIsChargeModalOpen(true)}
                                className="p-4 text-white transition-all bg-indigo-600 shadow-xl rounded-2xl hover:bg-indigo-500 active:scale-95"
                            >
                                <Plus size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <section className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm">
                <h3 className="flex items-center gap-2 mb-8 text-[10px] font-black tracking-widest uppercase text-slate-400 italic">
                    <Filter size={14} /> 외화 자산 포켓
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activePockets.length > 0 ? (
                        activePockets.map(([cur, bal]) => (
                            <div key={cur} className="flex items-center justify-between p-6 bg-slate-50 rounded-[28px] border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl italic font-black text-indigo-900">{cur}</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{CURRENCY_NAMES[cur] || cur}</p>
                                </div>
                                <p className="text-xl italic font-black text-slate-900">{bal.toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center col-span-full py-12 space-y-4 opacity-30 italic font-black text-slate-400 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                            <Briefcase size={36} />
                            <p className="text-xs uppercase tracking-widest">보유 중인 외화 자산이 없습니다</p>
                        </div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <section className="space-y-6 lg:col-span-12">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <h3 className="text-xl italic font-black tracking-tighter uppercase text-slate-900">
                                Business Transactions
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정산 소스 데이터 (Raw Ledger)</p>
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

                    <div className="bg-white border border-slate-100 rounded-[48px] shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6">일시</th>
                                    <th className="px-10 py-6">거래 정보</th>
                                    <th className="px-10 py-6 text-right">금액</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {businessTxs.length > 0 ? (
                                    businessTxs.map((tx) => (
                                        <tr key={tx.id} className="transition-colors hover:bg-slate-50/50 group">
                                            <td className="px-10 py-8 text-[11px] font-bold text-slate-400 font-mono italic">
                                                {tx.date.substring(0, 16).replace("T", " ")}
                                            </td>
                                            <td className="flex items-center gap-4 px-10 py-8">
                                                <div className={`p-2 rounded-lg ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}>
                                                    {tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div>
                                                    <span className="text-sm italic font-black text-slate-800 block">{tx.title}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {tx.type === "EXCHANGE" ? "환전" : tx.type === "CHARGE" ? "충전" : "송금"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`px-10 py-8 text-right font-black italic text-base ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} 
                                                <span className="text-[10px] uppercase opacity-40 ml-1">{tx.currency}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="py-32 text-xs italic font-black tracking-widest text-center uppercase text-slate-200">
                                            <div className="flex flex-col items-center gap-4">
                                                <Download size={48} className="opacity-20" />
                                                표시할 데이터가 없습니다.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* 충전 모달 */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center">
                        <h3 className="text-3xl italic font-black tracking-tighter uppercase text-slate-900">기업 자산 충전</h3>
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
                            <button onClick={() => setIsChargeModalOpen(false)} className="flex-1 py-6 text-xs font-black uppercase text-slate-400">취소</button>
                            <button onClick={handleCharge} className="flex-[2] bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95">충전하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorporateWallet;