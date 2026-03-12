import React, { useState, useEffect } from "react";
import http from "../../../config/http";

import { useWallet, type Transaction } from "../../../context/WalletContext";
import {
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  FileText,
  Download,
  Briefcase,
  Copy,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";

const CorporateWallet: React.FC = () => {
  const { showToast } = useToast();
  const { 
    corpBalances, 
    corpTransactions, 
    corpAccount, 
    setCorpAccount, 
    setCorpBalances, 
    setCorpTransactions,
    getWalletDataById
  } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await http.get("/auth/me");
        setProfile(response.data.data);
      } catch (err) {
        console.error("Profile fetch error");
      }
    };
    fetchProfile();
  }, []);

  // 🌟 [동기화] 프로필 정보가 있고 corpAccount가 비어있을 때 WalletContext 데이터 확인
  useEffect(() => {
    if (profile?.businessNumber && !corpAccount) {
      const walletData = getWalletDataById(profile.businessNumber);
      if (walletData?.userAccount && walletData.userAccount !== "미발급") {
        setCorpAccount(walletData.userAccount);
        setCorpBalances(walletData.balances);
      }
    }
  }, [profile, corpAccount, getWalletDataById, setCorpAccount, setCorpBalances]);

  // 🌟 [담당자님 구현 포인트] 기업 전용 계좌 발급 로직
  const handleActivateCorporateAccount = () => {
    setIsActivating(true);

    // 실제로는 B담당이 만든 API를 호출하여 DB에 기업 계좌를 생성해야 함
    setTimeout(() => {
      // 기업용 가상계좌 발급 규칙 (2003)
      const newCorpAccount = `EX-2003-${Math.floor(1000 + Math.random() * 9000)}`;
      setCorpAccount(newCorpAccount);
      setIsActivating(false);
      showToast("기업 전용 마스터 계좌(2003)가 발급되었습니다.", "SUCCESS");
    }, 2000);
  };

  const businessTxs = corpTransactions.filter((tx: Transaction) => tx.category === "BUSINESS");

  // 1. 계좌가 없을 때 보여줄 "발급 신청" 화면 (규칙에 어긋나거나 비어있는 경우)
  if (!corpAccount || (!corpAccount.startsWith("EX-2003") && !corpAccount.includes("2003"))) {
    return (
      <>
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
              정산 데이터 생성을 위한 <strong>기업 전용 마스터 계좌</strong>를
              발급해 주세요.
            </p>
          </div>

          <button
            onClick={handleActivateCorporateAccount}
            disabled={isActivating}
            className="group relative px-12 py-6 bg-slate-900 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isActivating ? (
              <Loader2 className="mx-auto animate-spin" size={24} />
            ) : (
              <span className="flex items-center gap-3">
                <Sparkles size={18} className="text-indigo-400" /> 기업 계좌
                즉시 발급하기
              </span>
            )}
          </button>
        </div>
      </>
    );
  }

  // 2. 계좌가 있을 때 보여줄 "기업 대시보드" 화면 (image_ee9806.png 스타일)
  return (
    <>
      <div className="p-8 mx-auto space-y-10 max-w-7xl animate-in fade-in font-sans bg-[#F8FAFC]">
        {/* 기업 정보 카드 */}
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
              <h2 className="text-4xl italic font-black leading-none tracking-tighter uppercase text-slate-900">
                {profile?.companyName || "(주) 글로벌 파트너스"}
              </h2>
              <div className="flex items-center gap-4 text-[11px] font-black text-slate-400">
                <p>
                  사업자 번호{" "}
                  <span className="ml-1 font-black text-slate-900">
                    {profile?.businessNumber || "123-45-67890"}
                  </span>
                </p>
                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                <p>
                  대표자{" "}
                  <span className="ml-1 font-black text-slate-900">{profile?.representative || profile?.name || "홍길동"}</span>
                </p>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-slate-900">
              <Building2 size={180} />
            </div>
          </div>

          {/* 기업 전용 계좌 ID (B담당 데이터와 연동될 핵심 번호) */}
          <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
                Corporate Dedicated ID
              </p>
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-3xl italic font-bold tracking-tighter">
                  {corpAccount}
                </h3>
                <button className="p-2 transition-colors bg-white/10 rounded-xl hover:bg-white/20">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="relative z-10 flex items-end justify-between pt-6 border-t border-white/5">
              <p className="text-2xl italic font-black tracking-tighter">
                ₩ {corpBalances.KRW.toLocaleString()}
              </p>
              <div className="p-3 bg-indigo-600 shadow-lg rounded-2xl shadow-indigo-500/20">
                <Briefcase size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* 하단 데이터 영역 */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                <h3 className="text-xl italic font-black tracking-tighter uppercase text-slate-900">
                  Business Transactions
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  정산 소스 데이터 (Raw Ledger)
                </p>
              </div>
              <div className="relative">
                <Search
                  className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-300"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="주문 번호 검색..."
                  className="pl-10 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-500 w-64 shadow-sm transition-all"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[40px] shadow-sm min-h-[400px] flex flex-col items-center justify-center">
              <div className="p-8 mb-4 rounded-full bg-slate-50 text-slate-200">
                <Download size={48} />
              </div>
              <p className="text-xs italic font-black tracking-widest uppercase text-slate-300">
                정산 대상 거래 데이터가 없습니다.
              </p>
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <div className="bg-indigo-600 rounded-[40px] p-10 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 transition-transform opacity-10 group-hover:scale-110">
                <Download size={100} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-indigo-200">
                Data Export Tool
              </p>
              <p className="mb-10 text-2xl italic font-black leading-tight tracking-tighter">
                정산 담당자를 위한
                <br />
                Raw Data 추출
              </p>
              <button className="w-full py-5 text-xs font-black tracking-widest text-indigo-600 uppercase transition-all bg-white shadow-lg rounded-2xl hover:shadow-indigo-50 active:scale-95">
                CSV 데이터 내보내기
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default CorporateWallet;
