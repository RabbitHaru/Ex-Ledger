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
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";
import { getAuthToken } from "../../../utils/auth";

declare global {
  interface Window {
    PortOne: any;
  }
}

const WalletOverview: React.FC = () => {
  const { showToast } = useToast();
  const { personalBalances, personalAccount, setPersonalAccount, chargeKrw } =
    useWallet();
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");
  const [isActivating, setIsActivating] = useState(false);

  const handleVerifyAndActivate = async () => {
    if (!window.PortOne) return;
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

      const apiRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/verify-identity`,
        { verificationId: response.identityVerificationId },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } },
      );

      const { realName, accountNumber } = apiRes.data;
      setPersonalAccount(accountNumber);
      localStorage.setItem("user_real_name", realName);
      showToast(`${realName}님, 본인인증 및 계좌 발급 완료!`, "SUCCESS");
    } catch (error) {
      showToast("인증 데이터 저장 중 오류가 발생했습니다.", "ERROR");
    } finally {
      setIsActivating(false);
    }
  };

  const handleCharge = async () => {
    try {
      await chargeKrw(Number(chargeAmount), "PERSONAL");
      setIsChargeModalOpen(false);
      setChargeAmount("");
      showToast("충고 완료!", "SUCCESS");
    } catch (err) {
      showToast("충전 실패", "ERROR");
    }
  };

  if (!personalAccount) {
    return (
      <CommonLayout>
        <div className="max-w-4xl px-6 py-32 mx-auto space-y-12 text-center animate-in fade-in">
          <div className="space-y-6">
            <div className="bg-teal-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-100/50">
              <ShieldCheck size={48} />
            </div>
            <h1 className="text-4xl italic font-black uppercase text-slate-900">
              Identity Verification
            </h1>
            <p className="font-bold leading-relaxed text-slate-500">
              KG이니시스 본인인증을 통해
              <br />
              개인 전용 지갑을 활성화해 주세요.
            </p>
          </div>
          <button
            onClick={handleVerifyAndActivate}
            disabled={isActivating}
            className="px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            {isActivating ? (
              <Loader2 className="mx-auto animate-spin" />
            ) : (
              "본인인증 후 지갑 활성화"
            )}
          </button>
        </div>
      </CommonLayout>
    );
  }

  return (
    <CommonLayout>
      <div className="p-10 mx-auto space-y-12 font-sans max-w-7xl animate-in fade-in">
        <header className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col justify-between h-full gap-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={14} className="text-teal-400" />
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">
                    나의 개인 자산 가치
                  </p>
                </div>
                <h2 className="text-5xl italic font-black tracking-tighter">
                  ₩ {personalBalances.KRW?.toLocaleString() || 0}{" "}
                  <span className="text-lg opacity-30">KRW</span>
                </h2>
              </div>
              <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">
                    인증된 개인 계좌
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-300">
                    {personalAccount}
                  </p>
                </div>
                <button
                  onClick={() => setIsChargeModalOpen(true)}
                  className="px-8 py-4 ml-auto font-sans text-xs italic font-black text-white uppercase bg-teal-500 shadow-lg rounded-2xl active:scale-95"
                >
                  원화 충전하기
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm flex flex-col items-center justify-center italic text-slate-200">
            <p className="text-xs font-black tracking-widest uppercase">
              Global Asset View
            </p>
          </div>
        </header>
      </div>

      {isChargeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center">
            <div className="mx-auto w-20 h-20 bg-teal-50 text-teal-600 rounded-[30px] flex items-center justify-center shadow-lg">
              <CreditCard size={40} />
            </div>
            <h3 className="text-3xl italic font-black uppercase text-slate-900">
              Charge Wallet
            </h3>
            <div className="relative">
              <input
                type="number"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                placeholder="0"
                className="w-full pb-6 text-6xl italic font-black text-center border-b-4 outline-none border-slate-50 focus:border-teal-500"
                autoFocus
              />
              <span className="absolute right-0 text-xl italic font-black bottom-8 text-slate-300">
                KRW
              </span>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="flex-1 py-6 text-xs font-black uppercase text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCharge}
                className="flex-[2] bg-slate-900 text-white py-6 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95"
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

export default WalletOverview;
