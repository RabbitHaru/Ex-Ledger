import React, { useState, useEffect } from "react";
import CommonLayout from "../../../components/layout/CommonLayout";
import { useWallet, type Transaction } from "../../../context/WalletContext";
import {
  Wallet,
  Plus,
  History,
  CreditCard,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useToast } from "../../../components/notification/ToastProvider";

// 🌟 포트원 V2 타입 선언
declare global {
  interface Window {
    PortOne: any;
  }
}

const CURRENCY_NAMES: Record<string, string> = {
  KRW: "대한민국 원",
  AED: "아랍에미리트 디르함",
  AUD: "호주 달러",
  BHD: "바레인 디나르",
  BND: "브루나이 달러",
  CAD: "캐나다 달러",
  CHF: "스위스 프랑",
  CNH: "위안화",
  DKK: "덴마크 크로네",
  EUR: "유로",
  GBP: "영국 파운드",
  HKD: "홍콩 달러",
  IDR: "인도네시아 루피아",
  JPY: "일본 엔",
  KWD: "쿠웨이트 디나르",
  MYR: "말레이시아 링깃",
  NOK: "노르웨이 크로네",
  NZD: "뉴질랜드 달러",
  SAR: "사우디 리얄",
  SEK: "스웨덴 크로나",
  SGD: "싱가포르 달러",
  THB: "태국 바트",
  USD: "미국 달러",
};

const WalletOverview: React.FC = () => {
  const { showToast } = useToast();
  const { balances, transactions, chargeKrw, userAccount, hasAccount } =
    useWallet();
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState("");

  const activePockets = (Object.entries(balances) as [string, number][]).filter(
    ([cur, bal]) => bal > 0 && cur !== "KRW",
  );

  // 🌟 [포트원 V2 연동] 결제 실행 함수
  const handlePortOnePayment = async () => {
    const amount = Number(chargeAmount);
    if (amount <= 0) {
      showToast("금액을 확인해 주세요.", "ERROR");
      return;
    }

    if (!window.PortOne) {
      showToast("결제 모듈을 불러올 수 없습니다.", "ERROR");
      return;
    }

    // .env에서 상점 ID와 채널 키 가져오기
    const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
    const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

    try {
      const response = await window.PortOne.requestPayment({
        storeId: storeId,
        channelKey: channelKey,
        paymentId: `payment-${Date.now()}`,
        orderName: "Ex-Ledger 지갑 충전",
        totalAmount: amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        customer: {
          fullName: "홍길동",
          phoneNumber: "010-0000-0000",
        },
        // 모바일 환경 리다이렉트 설정 (필요 시)
        redirectUrl: window.location.origin + "/wallet/overview",
      });

      // 🌟 결제 결과 처리 (V2는 응답 객체를 바로 확인 가능)
      if (response.code != null) {
        // 오류 발생
        showToast(response.message || "결제에 실패했습니다.", "ERROR");
        return;
      }

      // 결제 성공 시 (실제 서비스는 백엔드 승인 확인 후 chargeKrw 호출 권장)
      chargeKrw(amount);
      showToast(`${amount.toLocaleString()}원 충전 완료!`, "SUCCESS");
      setIsChargeModalOpen(false);
      setChargeAmount("");
    } catch (error) {
      console.error("PortOne Error:", error);
      showToast("결제 과정 중 오류가 발생했습니다.", "ERROR");
    }
  };

  return (
    <CommonLayout>
      <div className="p-10 mx-auto space-y-12 font-sans max-w-7xl animate-in fade-in">
        {/* 상단 섹션 생략 (이전과 동일) */}
        <header className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col justify-between h-full gap-10">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">
                    총 추정 자산 가치
                  </p>
                  <h2 className="text-5xl italic font-black tracking-tighter">
                    ₩ {balances.KRW.toLocaleString()}{" "}
                    <span className="text-lg not-italic opacity-30">KRW</span>
                  </h2>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Wallet className="text-teal-400" size={24} />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">
                    연결된 계좌 번호
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-300">
                    {userAccount}
                  </p>
                </div>
                <button
                  onClick={() => setIsChargeModalOpen(true)}
                  className="px-8 py-4 ml-auto font-sans text-xs italic font-black tracking-widest text-white uppercase transition-all bg-teal-500 shadow-lg hover:bg-teal-400 rounded-2xl active:scale-95"
                >
                  <Plus size={16} className="inline mr-1" /> 원화 충전하기
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-[48px] p-10 shadow-sm flex flex-col">
            <h3 className="flex items-center gap-2 mb-8 text-xs font-black tracking-widest uppercase text-slate-400">
              <Filter size={14} /> 보유 중인 외화 자산
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
              {activePockets.length > 0 ? (
                activePockets.map(([cur, bal]) => (
                  <div
                    key={cur}
                    className="flex items-center justify-between p-5 transition-colors border bg-slate-50 rounded-2xl border-slate-100 group hover:border-teal-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl italic font-black">{cur}</span>
                      <p className="text-[10px] font-bold text-slate-400">
                        {CURRENCY_NAMES[cur]}
                      </p>
                    </div>
                    <p className="text-lg italic font-black text-slate-900">
                      {bal.toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-2 italic font-black text-center opacity-30">
                  <CreditCard size={32} />
                  <p className="text-[10px]">보유 중인 외화가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 거래 내역 섹션 생략 (이전과 동일) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-sans text-2xl italic font-black tracking-tighter uppercase text-slate-900">
              최근 활동 내역
            </h3>
          </div>
          <div className="bg-white border border-slate-100 rounded-[56px] p-12 shadow-sm">
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((tx: Transaction) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-6 rounded-[32px] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`p-4 rounded-2xl ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}
                      >
                        {tx.amount > 0 ? (
                          <ArrowDownLeft size={22} />
                        ) : (
                          <ArrowUpRight size={22} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-lg italic font-black text-slate-800">
                            {tx.title}
                          </p>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${tx.category === "BUSINESS" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}
                          >
                            {tx.category === "BUSINESS"
                              ? "기업 거래"
                              : "개인 거래"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold tracking-widest uppercase text-slate-300">
                          {tx.date} • {tx.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xl font-black font-sans italic ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {Math.abs(tx.amount).toLocaleString()}{" "}
                        <span className="text-xs uppercase opacity-40">
                          {tx.currency}
                        </span>
                      </p>
                      <p className="text-[10px] font-black text-slate-300 uppercase mt-1 tracking-widest">
                        {tx.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 italic font-black text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 text-slate-200">
                    <History size={32} />
                  </div>
                  <p className="text-xs tracking-widest text-slate-300">
                    기록된 거래 내역이 없습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isChargeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-lg animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[56px] p-12 space-y-10 shadow-2xl text-center animate-in zoom-in-95">
            <div className="mx-auto w-20 h-20 bg-teal-50 text-teal-600 rounded-[28px] flex items-center justify-center shadow-lg shadow-teal-100">
              <CreditCard size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl italic font-black tracking-tighter uppercase text-slate-900">
                원화 충전
              </h3>
              <p className="text-xs italic font-bold tracking-widest uppercase text-slate-400">
                PortOne V2 연동됨
              </p>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                onKeyDown={(e) =>
                  ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()
                }
                value={chargeAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (Number(val) >= 0 && !val.includes("-")))
                    setChargeAmount(val);
                }}
                placeholder="0"
                className="w-full pb-6 text-6xl italic font-black tracking-tighter text-center transition-all border-b-4 outline-none border-slate-50 focus:border-teal-500"
                autoFocus
              />
              <span className="absolute right-0 text-xl italic font-black uppercase bottom-8 text-slate-300">
                KRW
              </span>
            </div>
            <div className="flex gap-4 pt-4 text-xs italic font-black tracking-widest uppercase">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="flex-1 py-6 transition-colors text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handlePortOnePayment}
                className="flex-[2] bg-slate-900 text-white py-6 rounded-[24px] shadow-2xl active:scale-95 transition-all"
              >
                Charge via PortOne
              </button>
            </div>
          </div>
        </div>
      )}
    </CommonLayout>
  );
};

export default WalletOverview;
