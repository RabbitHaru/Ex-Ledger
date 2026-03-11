import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonLayout from "../../layout/CommonLayout";
import { useToast } from "../../notification/ToastProvider";
import { useWallet } from "../../../context/WalletContext";
import { hasRole } from "../../../utils/auth";

import { Briefcase, User, Coins, Globe, Wallet, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import RemittanceTracking from "../../pages/remittance/Tracking/RemittanceTracking";
import ReceiptModal from "../../pages/remittance/ReceiptModal";

const SellerDashboard: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { personalAccount, corporateAccount, personalBalances, corporateBalances, executeTransfer, activatePersonalWallet } = useWallet();

  const isIndividual = hasRole("ROLE_USER");
  const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");
  const isCorpStaff = hasRole("ROLE_COMPANY_USER");

  const [activeTab, setActiveTab] = useState<"PERSONAL" | "BUSINESS">(isIndividual ? "PERSONAL" : "BUSINESS");
  const currentUserAccount = activeTab === "PERSONAL" ? personalAccount : corporateAccount;
  const currentBalances = activeTab === "PERSONAL" ? personalBalances : corporateBalances;
  const hasCurrentAccount = activeTab === "PERSONAL" ? !!personalAccount : !!corporateAccount;

  const [currencyMode, setCurrencyMode] = useState<"KRW" | "FOREIGN">("KRW");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const commission = activeTab === "BUSINESS" ? { network: 200, serviceRate: 0.003 } : { network: 500, serviceRate: 0.0005 };
  const baseKrw = Math.floor(Number(transferAmount));
  const calculatedFee = baseKrw > 0 ? commission.network + Math.floor(baseKrw * commission.serviceRate) : 0;
  const totalRequiredKrw = baseKrw + calculatedFee;

  // 🌟 KG 이니시스 본인인증 핸들러
  const handleCertification = () => {
    const { IMP } = window as any;
    if (!IMP) return;
    IMP.init('가맹점_식별코드'); // 실제 코드로 변경 필요

    IMP.certification({
      merchant_uid: `cert_${new Date().getTime()}`,
      popup: true
    }, async (rsp: any) => {
      if (rsp.success) {
        try {
          if (activatePersonalWallet) {
            await activatePersonalWallet(rsp.imp_uid);
            showToast("본인인증 및 지갑 활성화 성공!", "SUCCESS");
          }
        } catch (e) {
          showToast("지갑 활성화 중 오류가 발생했습니다.", "ERROR");
        }
      } else {
        showToast(`인증 실패: ${rsp.error_msg}`, "ERROR");
      }
    });
  };

  const handleExecuteTransfer = () => {
    if (currentBalances.KRW < totalRequiredKrw) { showToast("잔액이 부족합니다.", "ERROR"); return; }
    
    setIsProcessing(true);
    setTimeout(() => {
      try {
        executeTransfer(recipientAccount, Number(transferAmount), "KRW", 1, totalRequiredKrw, baseKrw, recipientName, activeTab);
        setReceiptData({
          txId: `TX-${Date.now()}`,
          sender: localStorage.getItem("user_real_name") || "홍길동",
          recipient: recipientName,
          recipientAcc: recipientAccount,
          amount: baseKrw,
          fee: calculatedFee,
          total: totalRequiredKrw,
          date: new Date().toLocaleString(),
          category: activeTab
        });
        setIsReceiptOpen(true);
        setTransferAmount("");
        setRecipientAccount("");
        setIsAccountVerified(false);
      } catch (error: any) { showToast(error.message, "ERROR"); }
      finally { setIsProcessing(false); }
    }, 2500);
  };

  return (
    <CommonLayout>
      <div className="max-w-4xl p-10 mx-auto animate-in fade-in">
        <header className="flex items-center justify-between mb-12">
          <button onClick={() => navigate(-1)} className="text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:text-slate-600 transition-colors">Back</button>
          {hasCurrentAccount && (
            <div className="text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{activeTab} Account ID</span>
              <span className="px-5 py-2 font-mono text-xs font-bold text-white bg-slate-900 rounded-2xl">{currentUserAccount}</span>
            </div>
          )}
        </header>

        {/* 탭 전환 스위치는 항상 노출하여 접근성을 높임 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl">
            <button onClick={() => (isIndividual || isCorpAdmin) && setActiveTab("PERSONAL")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === "PERSONAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"} ${!(isIndividual || isCorpAdmin) && "opacity-20"}`}><User size={14} className="inline mr-2"/> Personal</button>
            <button onClick={() => (isCorpStaff || isCorpAdmin) && setActiveTab("BUSINESS")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${activeTab === "BUSINESS" ? "bg-blue-600 text-white" : "text-slate-500"} ${!(isCorpStaff || isCorpAdmin) && "opacity-20"}`}><Briefcase size={14} className="inline mr-2"/> Business</button>
          </div>
        </div>

        {!hasCurrentAccount ? (
          <div className="space-y-8">
            {activeTab === "PERSONAL" ? (
              /* 🌟 개인 지갑 미활성화 시 본인인증 카드 노출 */
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[48px] shadow-sm border border-slate-100 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8">
                  <ShieldCheck className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 mb-4 uppercase">Identity Verification</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-12">
                  KG이니시스 본인인증을 통해<br/>개인 전용 지갑을 활성화해 주세요.
                </p>
                <button 
                  onClick={handleCertification}
                  className="w-full max-w-sm py-6 bg-[#0f172a] text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  본인인증 후 지갑 활성화
                </button>
              </div>
            ) : (
              /* 기업 지갑 미활성화 시 기존 메시지 노출 */
              <div className="max-w-4xl py-32 text-center space-y-8 bg-slate-50 rounded-[48px]">
                <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-slate-200 shadow-sm"><Wallet size={32} /></div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Business Wallet Inactive</h1>
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest leading-relaxed">기업 계좌는 관리자 승인이 완료된 후<br/>자동으로 활성화됩니다.</p>
              </div>
            )}
          </div>
        ) : (
          /* 계좌가 활성화된 경우의 기존 대시보드 UI */
          <div className="space-y-8">
            <RemittanceTracking status={isProcessing ? "PROCESSING" : "READY"} transactionId="TX-LIVE-001" updatedAt="Real-time" />
            <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl space-y-12 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full" />
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-3xl max-w-xs">
                <button onClick={() => setCurrencyMode("KRW")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${currencyMode === "KRW" ? "bg-slate-800 text-teal-400" : "text-slate-500"}`}><Coins size={14} className="inline mr-2"/> KRW</button>
                <button onClick={() => setCurrencyMode("FOREIGN")} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all ${currencyMode === "FOREIGN" ? "bg-slate-800 text-teal-400" : "text-slate-500"}`}><Globe size={14} className="inline mr-2"/> Global</button>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Recipient ID</label>
                <div className="flex gap-3">
                  <input type="text" value={recipientAccount} onChange={(e) => { setRecipientAccount(e.target.value); setIsAccountVerified(false); }} placeholder="EX-XXXX-XXXX" className="flex-1 p-6 font-sans font-bold border border-white/10 outline-none bg-white/5 rounded-[24px] focus:border-blue-500 transition-all text-white" />
                  <button onClick={() => { setIsAccountVerified(true); setRecipientName("Recipient One"); }} className="px-8 text-xs font-black bg-white/10 hover:bg-white/20 rounded-[24px]">Verify</button>
                </div>
                {isAccountVerified && <div className="p-4 border border-teal-500/20 bg-teal-500/10 rounded-2xl flex items-center gap-3 text-teal-400 text-xs font-bold italic"><CheckCircle2 size={16}/> Verified: {recipientName}</div>}
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 rounded-[40px] p-10 border border-white/5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Transfer Amount</p>
                  <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full text-6xl italic font-black tracking-tighter bg-transparent outline-none text-white" placeholder="0" disabled={!isAccountVerified} />
                </div>
                <div className="p-8 bg-blue-600/5 rounded-3xl border border-white/5 flex justify-between items-end">
                  <div className="space-y-1"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Withdrawal Total</span><p className="text-[9px] text-slate-500 font-bold tracking-tight">Fee: {calculatedFee.toLocaleString()} KRW Included</p></div>
                  <div className="text-right"><span className="text-4xl italic font-black tracking-tighter">{totalRequiredKrw.toLocaleString()}</span><span className="ml-2 text-[10px] font-bold text-slate-500">KRW</span></div>
                </div>
              </div>

              <button onClick={handleExecuteTransfer} disabled={!transferAmount || !isAccountVerified || isProcessing} className={`w-full py-8 rounded-[32px] font-black text-xl shadow-2xl active:scale-95 transition-all italic uppercase tracking-widest ${activeTab === "BUSINESS" ? "bg-blue-600 shadow-blue-500/20" : "bg-teal-600 shadow-teal-500/20"}`}>
                {isProcessing ? <Loader2 size={24} className="mx-auto animate-spin" /> : `Execute ${activeTab}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {isReceiptOpen && receiptData && (
        <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} data={receiptData} />
      )}
    </CommonLayout>
  );
};

export default SellerDashboard;