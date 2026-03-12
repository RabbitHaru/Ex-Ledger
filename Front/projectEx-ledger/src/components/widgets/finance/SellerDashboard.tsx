import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "../../notification/ToastProvider";
import { useWallet } from "../../../context/WalletContext";
import { hasRole } from "../../../config/auth";

import {
    Briefcase, User, Coins, Globe, Wallet, ArrowLeft, Loader2,
    CheckCircle2, ShieldCheck, Sparkles, Search, Check, AlertTriangle
} from "lucide-react";
import RemittanceTracking from "../../pages/remittance/Tracking/RemittanceTracking";
import ReceiptModal from "../../pages/remittance/ReceiptModal";

const SellerDashboard: React.FC = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const {
        personalAccount, corporateAccount,
        personalBalances, corporateBalances,
        executeTransfer, activatePersonalWallet,
        isLoading
    } = useWallet();

    const isIndividual = hasRole("ROLE_USER");
    const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");
    const isCorpStaff = hasRole("ROLE_COMPANY_USER");

    const [activeTab, setActiveTab] = useState<"PERSONAL" | "BUSINESS">(isIndividual ? "PERSONAL" : "BUSINESS");
    const [currencyMode, setCurrencyMode] = useState<"KRW" | "FOREIGN">("KRW");
    const [targetCurrency, setTargetCurrency] = useState("USD");
    const [currentRate, setCurrentRate] = useState<number>(1);

    const [recipientAccount, setRecipientAccount] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [isAccountVerified, setIsAccountVerified] = useState(false);
    const [transferAmount, setTransferAmount] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    // 모달 상태
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [trackingStatus, setTrackingStatus] = useState<string>("READY");

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const currentUserAccount = activeTab === "PERSONAL" ? personalAccount : corporateAccount;
    const currentBalances = activeTab === "PERSONAL" ? personalBalances : corporateBalances;
    const hasCurrentAccount = activeTab === "PERSONAL" ? !!personalAccount : !!corporateAccount;

    // 수수료 정책 (B담당 추천안 정책 적용)
    const commission = activeTab === "BUSINESS"
        ? { network: 200, serviceRate: 0.003 }
        : { network: 500, serviceRate: 0.0005 };

    const baseKrw = currencyMode === "KRW"
        ? Math.floor(Number(transferAmount))
        : Math.floor(Number(transferAmount) * currentRate);

    const calculatedFee = baseKrw > 0 ? commission.network + Math.floor(baseKrw * commission.serviceRate) : 0;
    const totalRequiredKrw = baseKrw + calculatedFee;

    // 🌟 [B담당 로직 결합] 실시간 환율 조회
    useEffect(() => {
        if (currencyMode === "FOREIGN") {
            const fetchRate = async () => {
                try {
                    const res = await fetch(`https://api.frankfurter.app/latest?from=KRW&to=${targetCurrency}`);
                    const data = await res.json();
                    setCurrentRate(Number((1 / data.rates[targetCurrency]).toFixed(2)));
                } catch (err) {
                    setCurrentRate(1350); // 에러 시 기본 환율
                }
            };
            fetchRate();
        } else {
            setCurrentRate(1);
        }
    }, [targetCurrency, currencyMode]);

    // 🌟 [C담당 실결합] KG 이니시스 본인인증
    const handleCertification = () => {
        const { IMP } = window as any;
        if (!IMP) return;
        IMP.init(import.meta.env.VITE_PORTONE_STORE_ID);

        IMP.certification({
            merchant_uid: `cert-${Date.now()}`,
            popup: true
        }, async (rsp: any) => {
            if (rsp.success) {
                try {
                    await activatePersonalWallet(rsp.imp_uid);
                    showToast("본인인증 및 지갑 활성화 성공!", "SUCCESS");
                } catch (e) {
                    showToast("지갑 활성화 중 오류가 발생했습니다.", "ERROR");
                }
            } else {
                showToast(`인증 실패: ${rsp.error_msg}`, "ERROR");
            }
        });
    };

    const handleVerifyAccount = () => {
        if (!recipientAccount) {
            showToast("계좌번호를 입력해 주세요.", "ERROR");
            return;
        }
        if (recipientAccount === currentUserAccount) {
            showToast("본인 계좌로는 송금할 수 없습니다.", "ERROR");
            return;
        }
        setIsProcessing(true);
        // 수취인 확인 로직 (시뮬레이션)
        setTimeout(() => {
            setIsProcessing(false);
            setRecipientName(recipientAccount.includes("2003") ? "(주) 글로벌파트너스 (기업)" : "인증된 개인 사용자");
            setIsAccountVerified(true);
            showToast("수취 계좌 확인 완료", "SUCCESS");
        }, 800);
    };

    const handleExecuteTransfer = async () => {
        if (currentBalances.KRW < totalRequiredKrw) {
            showToast("잔액이 부족합니다.", "ERROR");
            return;
        }

        setIsConfirmModalOpen(false);
        setIsProcessing(true);

        try {
            // 1단계: 검토 중 (4초)
            setTrackingStatus("REVIEWING");
            await delay(4000);

            // 2단계: 승인 완료 (4초)
            setTrackingStatus("APPROVED");
            await delay(4000);

            // 3단계: 이체 진행 (4초 - 실제 API 호출 포함)
            setTrackingStatus("TRANSFERRING");
            
            await executeTransfer(
                recipientAccount,
                Number(transferAmount),
                currencyMode === "KRW" ? "KRW" : targetCurrency,
                currentRate,
                totalRequiredKrw,
                baseKrw,
                recipientName,
                activeTab
            );
            
            await delay(4000);

            // 4단계: 완료
            setTrackingStatus("COMPLETED");

            setReceiptData({
                txId: `TX-${Date.now()}`,
                sender: localStorage.getItem("user_real_name") || "사용자",
                recipient: recipientName,
                recipientAcc: recipientAccount,
                amount: Number(transferAmount),
                currency: currencyMode === "KRW" ? "KRW" : targetCurrency,
                totalKrw: totalRequiredKrw,
                fee: calculatedFee,
                date: new Date().toLocaleString(),
                category: activeTab
            });

            setIsReceiptOpen(true);
            setTransferAmount("");
            setRecipientAccount("");
            setIsAccountVerified(false);
            showToast(`${activeTab === "BUSINESS" ? "기업 거래" : "개인 이체"} 성공!`, "SUCCESS");
        } catch (error: any) {
            showToast(error.message, "ERROR");
            setTrackingStatus("READY");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) return (
        <>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
            </div>
        </>
    );

    return (
        <>
            <div className="max-w-4xl p-10 mx-auto animate-in fade-in">
                <header className="flex items-center justify-between mb-12">
                    <button onClick={() => navigate(-1)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-slate-600 transition-all">
                        <ArrowLeft size={14} /> 뒤로 가기
                    </button>
                    {hasCurrentAccount && (
                        <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{activeTab === "PERSONAL" ? "개인 계좌 ID" : "기업 계좌 ID"}</span>
                            <span className="px-5 py-2 font-mono text-xs font-bold text-white bg-slate-900 rounded-2xl shadow-xl">{currentUserAccount}</span>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl">
                        <button onClick={() => isIndividual && setActiveTab("PERSONAL")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === "PERSONAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"} ${!isIndividual && "opacity-20"}`}><User size={14} className="inline mr-2"/> 개인 송금</button>
                        <button onClick={() => (isCorpStaff || isCorpAdmin) && setActiveTab("BUSINESS")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === "BUSINESS" ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"} ${!(isCorpStaff || isCorpAdmin) && "opacity-20"}`}><Briefcase size={14} className="inline mr-2"/> 기업 송금</button>
                    </div>
                </div>

                {!hasCurrentAccount ? (
                    <div className="animate-in slide-in-from-bottom-4 duration-700">
                        {activeTab === "PERSONAL" ? (
                            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[48px] shadow-sm border border-slate-100 text-center">
                                <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mb-8 shadow-inner"><ShieldCheck className="w-12 h-12 text-emerald-500" /></div>
                                <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 mb-4 uppercase">본인 인증 필요</h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-12">보안을 위해 본인인증 후<br/>개인 지갑을 활성화할 수 있습니다.</p>
                                <button onClick={handleCertification} className="w-full max-w-sm py-6 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl active:scale-95">본인인증 후 지갑 활성화</button>
                            </div>
                        ) : (
                            <div className="max-w-4xl py-32 text-center space-y-8 bg-slate-50 rounded-[48px] border border-dashed border-slate-200">
                                <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-slate-200 shadow-sm"><Wallet size={32} /></div>
                                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">기업 지갑 비활성화</h1>
                                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest leading-relaxed">기업 계좌는 관리자 승인 완료 후<br/>자동으로 활성화됩니다.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <RemittanceTracking status={trackingStatus} transactionId="TX-LIVE-MONITOR" updatedAt="REAL-TIME" />

                        <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl space-y-12 border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full -mr-48 -mt-48" />

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex gap-2 p-1.5 bg-white/5 rounded-3xl">
                                    <button onClick={() => setCurrencyMode("KRW")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${currencyMode === "KRW" ? "bg-slate-800 text-teal-400" : "text-slate-500"}`}><Coins size={14} className="inline mr-2"/> 국내 송금 (KRW)</button>
                                    <button onClick={() => setCurrencyMode("FOREIGN")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${currencyMode === "FOREIGN" ? "bg-slate-800 text-teal-400" : "text-slate-500"}`}><Globe size={14} className="inline mr-2"/> 해외 송금</button>
                                </div>
                                <div className="flex items-center justify-end px-4 text-teal-400 font-bold text-[11px]">
                                    <Wallet size={12} className="mr-2"/> 보유 잔액: {currentBalances.KRW.toLocaleString()} KRW
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">받는 분 계좌번호</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <input type="text" value={recipientAccount} onChange={(e) => { setRecipientAccount(e.target.value); setIsAccountVerified(false); }} placeholder="EX-XXXX-XXXX" className="w-full p-6 font-mono font-bold border border-white/10 outline-none bg-white/5 rounded-[24px] focus:border-blue-500 transition-all text-white" />
                                        {isProcessing && <Loader2 size={18} className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />}
                                    </div>
                                    <button onClick={handleVerifyAccount} disabled={!recipientAccount || isProcessing} className="px-8 text-xs font-black bg-white/10 hover:bg-white/20 rounded-[24px] border border-white/5 transition-all">확인</button>
                                </div>
                                {isAccountVerified && (
                                    <div className="p-5 bg-teal-500/10 border border-teal-500/20 rounded-[24px] flex items-center gap-3 text-teal-400 text-sm font-black italic animate-in slide-in-from-top-2">
                                        <CheckCircle2 size={18}/> {recipientName} 확인 완료
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                <div className={`bg-white/5 rounded-[40px] p-10 border transition-all ${isAccountVerified ? "border-white/10" : "border-white/5 opacity-50"}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">송금 금액</p>
                                        {currencyMode === "FOREIGN" ? (
                                            <select value={targetCurrency} onChange={(e) => setTargetCurrency(e.target.value)} className="bg-slate-800 text-white text-[10px] font-black p-2 rounded-xl outline-none cursor-pointer">
                                                <option value="USD">🇺🇸 USD</option>
                                                <option value="JPY">🇯🇵 JPY</option>
                                                <option value="EUR">🇪🇺 EUR</option>
                                            </select>
                                        ) : <span className="text-xl italic font-black opacity-30">KRW (원화)</span>}
                                    </div>
                                    <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full text-7xl italic font-black tracking-tighter bg-transparent outline-none text-white" placeholder="0" disabled={!isAccountVerified} />
                                    {currencyMode === "FOREIGN" && <p className="mt-4 text-[11px] font-bold text-slate-500 italic">적용 환율: 1 {targetCurrency} = {currentRate.toLocaleString()} KRW</p>}
                                </div>

                                <div className="p-8 bg-blue-600/5 rounded-[32px] border border-white/5 flex justify-between items-end">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">총 출금액</span>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">{activeTab === "PERSONAL" ? "개인" : "기업"} 수수료: {calculatedFee.toLocaleString()} KRW 포함</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-4xl italic font-black tracking-tighter text-white">{totalRequiredKrw.toLocaleString()}</span>
                                        <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase">KRW</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={!transferAmount || !isAccountVerified || isProcessing}
                                className={`w-full py-8 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all italic uppercase tracking-widest ${activeTab === "BUSINESS" ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20" : "bg-teal-600 hover:bg-teal-500 shadow-teal-500/20"}`}
                            >
                                {isProcessing ? <Loader2 className="mx-auto animate-spin" /> : `${activeTab === "PERSONAL" ? "개인" : "기업"} 송금 실행`}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 최종 확인 모달 (B담당) */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-8 shadow-2xl text-center">
                        <h3 className="text-3xl italic font-black uppercase text-slate-900 tracking-tighter">최종 확인</h3>
                        <div className="p-8 bg-slate-50 rounded-[32px]">
                            <p className="text-2xl font-black italic text-slate-900">{recipientName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{recipientAccount}</p>
                        </div>
                        <div className="space-y-4 text-left">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 border-b pb-2 uppercase"><span>송금액</span><span className="text-slate-900">{Number(transferAmount).toLocaleString()} {currencyMode === "KRW" ? "KRW" : targetCurrency}</span></div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase"><span>서비스 수수료</span><span className="text-red-500">+{calculatedFee.toLocaleString()} KRW</span></div>
                            <div className="pt-4 border-t text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">총 출금액</p>
                                <p className="text-4xl italic font-black text-slate-900">{totalRequiredKrw.toLocaleString()} KRW</p>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-6">
                            <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-5 text-xs font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">취소</button>
                            <button onClick={handleExecuteTransfer} className={`flex-[2] text-white py-5 rounded-[20px] font-black text-xs uppercase shadow-xl tracking-[0.1em] ${activeTab === "BUSINESS" ? "bg-blue-600" : "bg-teal-600"}`}>확인 및 송금</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 영수증 모달 (C담당) */}
            {isReceiptOpen && receiptData && (
                <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} data={receiptData} />
            )}
        </>
    );
};

export default SellerDashboard;