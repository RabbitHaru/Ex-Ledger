import React, { useState } from "react";
import axios from "axios";
import CommonLayout from "../../../components/layout/CommonLayout";
import { useWallet } from "../../../context/WalletContext";
import {
    Wallet,
    Plus,
    CreditCard,
    ShieldCheck,
    UserCheck,
    Loader2,
    History,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";
import { getAuthToken } from "../../../utils/auth";

// --- Constants (B담당 통화 명칭 반영) ---
const CURRENCY_NAMES: Record<string, string> = {
    KRW: "대한민국 원", AED: "아랍에미리트 디르함", AUD: "호주 달러", BHD: "바레인 디나르",
    BND: "브루나이 달러", CAD: "캐나다 달러", CHF: "스위스 프랑", CNH: "위안화",
    DKK: "덴마크 크로네", EUR: "유로", GBP: "영국 파운드", HKD: "홍콩 달러",
    IDR: "인도네시아 루피아", JPY: "일본 엔", KWD: "쿠웨이트 디나르", MYR: "말레이시아 링깃",
    NOK: "노르웨이 크로네", NZD: "뉴질랜드 달러", SAR: "사우디 리얄", SEK: "스웨덴 크로나",
    SGD: "싱가포르 달러", THB: "태국 바트", USD: "미국 달러",
};

declare global {
    interface Window {
        PortOne: any;
    }
}

const WalletOverview: React.FC = () => {
    const { showToast } = useToast();
    const {
        personalBalances,
        personalAccount,
        setPersonalAccount,
        chargeKrw,
        transactions,
        isLoading
    } = useWallet();

    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState("");
    const [isActivating, setIsActivating] = useState(false);

    // 🌟 [B담당 UI 로직] 보유 중인 외화 필터링
    const activePockets = (Object.entries(personalBalances) as [string, number][]).filter(
        ([cur, bal]) => bal > 0 && cur !== "KRW"
    );

    // 🌟 [C담당 실결합] 본인인증 및 지갑 활성화 로직
    const handleVerifyAndActivate = async () => {
        if (!window.PortOne) {
            showToast("인증 모듈을 불러올 수 없습니다.", "ERROR");
            return;
        }
        setIsActivating(true);

        try {
            const response = await window.PortOne.requestIdentityVerification({
                storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                channelKey: import.meta.env.VITE_PORTONE_AUTH_CHANNEL_KEY,
                identityVerificationId: `auth-${Date.now()}`,
            });

            if (response.code != null) {
                showToast(response.message || "인증 실패", "ERROR");
                return;
            }

            // 서버에 인증 ID 전달 및 지갑 생성
            const apiRes = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/wallet/verify-identity`,
                { impUid: response.identityVerificationId },
                { headers: { Authorization: `Bearer ${getAuthToken()}` } }
            );

            const { realName, accountNumber } = apiRes.data;
            setPersonalAccount(accountNumber);
            localStorage.setItem("user_real_name", realName);
            showToast(`${realName}님, 지갑이 활성화되었습니다!`, "SUCCESS");
        } catch (error) {
            showToast("인증 데이터 처리 중 오류가 발생했습니다.", "ERROR");
        } finally {
            setIsActivating(false);
        }
    };

    const handleCharge = async () => {
        try {
            await chargeKrw(Number(chargeAmount), "PERSONAL");
            setIsChargeModalOpen(false);
            setChargeAmount("");
            showToast("충전 요청이 완료되었습니다.", "SUCCESS");
        } catch (err) {
            showToast("충전 처리 실패", "ERROR");
        }
    };

    // 로딩 중일 때 (새로고침 이슈 방지)
    if (isLoading) return (
        <CommonLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-slate-200" size={48} />
            </div>
        </CommonLayout>
    );

    // 1. 계좌가 없을 때 (본인인증 UI - C담당)
    if (!personalAccount) {
        return (
            <CommonLayout>
                <div className="max-w-4xl px-6 py-32 mx-auto space-y-12 text-center animate-in fade-in">
                    <div className="space-y-6">
                        <div className="bg-teal-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-100/50">
                            <ShieldCheck size={48} />
                        </div>
                        <h1 className="text-4xl italic font-black uppercase text-slate-900 tracking-tighter">
                            Identity Verification
                        </h1>
                        <p className="font-bold leading-relaxed text-slate-500 uppercase text-[11px] tracking-widest">
                            보안 강화를 위해 본인인증 후<br />개인 전용 지갑을 활성화할 수 있습니다.
                        </p>
                    </div>
                    <button
                        onClick={handleVerifyAndActivate}
                        disabled={isActivating}
                        className="px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95"
                    >
                        {isActivating ? <Loader2 className="animate-spin mx-auto" size={24} /> : "본인인증 후 지갑 활성화"}
                    </button>
                </div>
            </CommonLayout>
        );
    }

    // 2. 계좌가 있을 때 (통합 대시보드 UI)
    return (
        <CommonLayout>
            <div className="p-10 mx-auto space-y-12 font-sans max-w-7xl animate-in fade-in">
                <header className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* 메인 KRW 카드 */}
                    <div className="lg:col-span-2 bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 rounded-full bg-teal-500/10 blur-3xl" />
                        <div className="relative z-10 flex flex-col justify-between h-full gap-10">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <UserCheck size={14} className="text-teal-400" />
                                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">My Personal Asset</p>
                                </div>
                                <h2 className="text-5xl italic font-black tracking-tighter leading-none">
                                    ₩ {personalBalances.KRW?.toLocaleString() || 0} <span className="text-lg opacity-30">KRW</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Personal Account ID</p>
                                    <p className="font-mono text-sm font-bold text-slate-300">{personalAccount}</p>
                                </div>
                                <button
                                    onClick={() => setIsChargeModalOpen(true)}
                                    className="px-8 py-4 ml-auto font-sans text-xs italic font-black text-white uppercase bg-teal-500 shadow-lg rounded-2xl active:scale-95 transition-all hover:bg-teal-400"
                                >
                                    <Plus size={16} className="inline mr-1" /> 충전하기
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 외화 포켓 리스트 (B담당 UI 반영) */}
                    <div className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm flex flex-col">
                        <h3 className="flex items-center gap-2 mb-8 text-[10px] font-black tracking-widest uppercase text-slate-400 italic">
                            <Filter size={14} /> Global Asset Pockets
                        </h3>
                        <div className="flex-1 space-y-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                            {activePockets.length > 0 ? (
                                activePockets.map(([cur, bal]) => (
                                    <div key={cur} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-teal-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl italic font-black">{cur}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{CURRENCY_NAMES[cur]}</p>
                                        </div>
                                        <p className="text-lg italic font-black text-slate-900">{bal.toLocaleString()}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-20 italic font-black">
                                    <CreditCard size={32} />
                                    <p className="text-[9px] uppercase tracking-tighter">No Foreign Assets</p>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* 거래 내역 섹션 (B담당 상세 UI 반영) */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl italic font-black tracking-tighter uppercase text-slate-900">Recent Ledger Activity</h3>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[56px] p-8 shadow-sm">
                        <div className="space-y-2">
                            {transactions.length > 0 ? (
                                transactions.filter(tx => tx.category === "PERSONAL").map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-6 rounded-[32px] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                        <div className="flex items-center gap-6">
                                            <div className={`p-4 rounded-2xl ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}>
                                                {tx.amount > 0 ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-lg italic font-black text-slate-800">{tx.title}</p>
                                                    <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase bg-slate-100 text-slate-400">Personal</span>
                                                </div>
                                                <p className="mt-1 text-[10px] font-bold tracking-widest uppercase text-slate-300">{tx.date} • {tx.type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-black italic ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}>
                                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} <span className="text-[10px] uppercase opacity-30">{tx.currency}</span>
                                            </p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase mt-1 tracking-widest">{tx.status}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 italic font-black text-center text-slate-200">
                                    <History size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="text-xs uppercase tracking-[0.2em]">No Transaction Records</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* 충전 모달 (통합 디자인) */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center animate-in zoom-in-95">
                        <div className="mx-auto w-20 h-20 bg-teal-50 text-teal-600 rounded-[30px] flex items-center justify-center shadow-lg"><CreditCard size={40} /></div>
                        <div className="space-y-2">
                            <h3 className="text-3xl italic font-black uppercase text-slate-900">Charge Wallet</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toss Payments 연동</p>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={chargeAmount}
                                onChange={(e) => setChargeAmount(e.target.value)}
                                placeholder="0"
                                className="w-full pb-6 text-6xl italic font-black text-center border-b-4 outline-none border-slate-50 focus:border-teal-500"
                                autoFocus
                            />
                            <span className="absolute right-0 text-xl italic font-black bottom-8 text-slate-300">KRW</span>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsChargeModalOpen(false)} className="flex-1 py-6 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                            <button onClick={handleCharge} className="flex-[2] bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all">Charge Now</button>
                        </div>
                    </div>
                </div>
            )}
        </CommonLayout>
    );
};

export default WalletOverview;