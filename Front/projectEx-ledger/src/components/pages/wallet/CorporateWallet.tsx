import React, { useState } from "react";
import axios from "axios";
import CommonLayout from "../../../components/layout/CommonLayout";
import { useWallet } from "../../../context/WalletContext";
import { hasRole } from "../../../utils/auth";
import {
  Building2,
  Briefcase,
  Plus,
  Loader2,
  ShieldAlert,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";
import { getAuthToken } from "../../../utils/auth";

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

  const isCorpAdmin = hasRole("ROLE_COMPANY_ADMIN");

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
      setCorporateAccount(accountNumber, name);
      showToast(`${name} 마스터 계좌가 활성화되었습니다.`, "SUCCESS");
    } catch (err) {
      showToast("기업 계좌 활성화 서버 통신 실패", "ERROR");
    } finally {
      setIsActivating(false);
    }
  };

  const handleCharge = async () => {
    try {
      await chargeKrw(Number(chargeAmount), "BUSINESS");
      setIsChargeModalOpen(false);
      setChargeAmount("");
      showToast("기업 자금 충전 완료!", "SUCCESS");
    } catch (err) {
      showToast("충고 처리 오류", "ERROR");
    }
  };

  const businessTxs = transactions.filter((tx) => tx.category === "BUSINESS");

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
            <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest">
              {companyName || "DB Syncing..."}
            </p>
            {isCorpAdmin ? (
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
              >
                {isActivating ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "기업 마스터 계좌 즉시 발급"
                )}
              </button>
            ) : (
              <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-4">
                <ShieldAlert size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-medium leading-relaxed text-center text-slate-400">
                  관리자(Admin)가 기업 마스터 계좌를
                  <br />
                  활성화할 때까지 기다려 주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </CommonLayout>
    );
  }

  return (
    <CommonLayout>
      <div className="p-8 mx-auto space-y-10 font-sans max-w-7xl animate-in fade-in">
        <header className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase">
                  Shared Account
                </span>
              </div>
              {/* 🌟 DB에서 가져온 실제 이름 표시! */}
              <h2 className="text-4xl italic font-black uppercase text-slate-900">
                {companyName}
              </h2>
            </div>
            <Building2
              size={120}
              className="absolute bottom-0 right-0 p-8 opacity-50 text-slate-50"
            />
          </div>
          <div className="bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                Master Account ID
              </p>
              <h3 className="font-mono text-3xl italic font-bold tracking-tighter">
                {corporateAccount}
              </h3>
            </div>
            <div className="relative z-10 flex items-end justify-between pt-8 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Balance
                </p>
                <p className="text-4xl italic font-black tracking-tighter">
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

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl italic font-black tracking-tighter uppercase text-slate-900">
              Settlement Ledger
            </h3>
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-500 shadow-sm">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="bg-white border border-slate-100 rounded-[56px] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6">Date</th>
                  <th className="px-10 py-6">Transaction Title</th>
                  <th className="px-10 py-6 text-right">Amount (KRW)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {businessTxs.length > 0 ? (
                  businessTxs.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-slate-50/50 group"
                    >
                      <td className="px-10 py-8 text-[11px] font-bold text-slate-400 font-mono italic">
                        {tx.date}
                      </td>
                      <td className="flex items-center gap-4 px-10 py-8">
                        <div
                          className={`p-2 rounded-lg ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}
                        >
                          {tx.amount > 0 ? (
                            <ArrowDownLeft size={16} />
                          ) : (
                            <ArrowUpRight size={16} />
                          )}
                        </div>
                        <span className="text-sm italic font-black text-slate-800">
                          {tx.title}
                        </span>
                      </td>
                      <td
                        className={`px-10 py-8 text-right font-black italic text-base ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}
                      >
                        {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-32 text-xs italic font-black tracking-widest text-center uppercase text-slate-200"
                    >
                      데이터를 찾을 수 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isChargeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center">
            <h3 className="text-3xl italic font-black tracking-tighter uppercase text-slate-900">
              Corporate Deposit
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {companyName} 자산 충전
            </p>
            <input
              type="number"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="0"
              className="w-full pb-6 text-6xl italic font-black text-center border-b-4 outline-none border-slate-50 focus:border-indigo-500"
              autoFocus
            />
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="flex-1 py-6 text-xs font-black uppercase text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCharge}
                className="flex-[2] bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95"
              >
                Charge Now
              </button>
            </div>
          </div>
        </div>
      )}
    </CommonLayout>
  );
};

export default CorporateWallet;
