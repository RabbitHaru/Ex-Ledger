import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CommonLayout from "../../../components/layout/CommonLayout";
import { useWallet, type Transaction } from "../../../context/WalletContext";
import {
  ArrowLeft,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Download,
  User,
  ListFilter,
} from "lucide-react";

const PersonalHistory: React.FC = () => {
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const [searchTerm, setSearchTerm] = useState("");

  // 🌟 정산용 데이터(BUSINESS)를 제외한 순수 개인 거래만 노출
  const personalTxs = transactions.filter((tx) => tx.category === "PERSONAL");

  const filteredTxs = personalTxs.filter(
    (tx) =>
      tx.title.includes(searchTerm) ||
      tx.currency.includes(searchTerm.toUpperCase()),
  );

  return (
    <CommonLayout>
      <div className="p-10 mx-auto space-y-10 font-sans max-w-7xl animate-in fade-in">
        {/* 헤더 섹션 */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase mb-4 tracking-widest hover:text-slate-600"
            >
              <ArrowLeft size={14} /> Dashboard
            </button>
            <h2 className="flex items-center gap-3 text-4xl italic font-black tracking-tighter uppercase text-slate-900">
              <User className="text-teal-600" size={32} /> 개인 거래 장부
            </h2>
            <p className="text-sm italic font-bold tracking-widest uppercase text-slate-400">
              개인용 거래 데이터 원천(Raw Data) 보기
            </p>
          </div>

          <div className="relative group">
            <Search
              className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-300"
              size={18}
            />
            <input
              type="text"
              placeholder="거래 내역 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] text-sm font-bold outline-none focus:border-teal-500 w-full md:w-80 shadow-sm"
            />
          </div>
        </header>

        {/* 내역 리스트 섹션 */}
        <section className="bg-white border border-slate-100 rounded-[56px] p-10 shadow-sm">
          <div className="flex items-center justify-between px-4 mb-10">
            <div className="flex items-center gap-3 text-xs font-black tracking-widest uppercase text-slate-400">
              <ListFilter size={18} /> 실시간 거래 원장
            </div>
            <button className="flex items-center gap-2 text-[10px] font-black text-slate-900 bg-slate-50 px-5 py-2.5 rounded-xl hover:bg-slate-100 uppercase tracking-widest">
              <Download size={14} /> 전체 내역 추출 (CSV)
            </button>
          </div>

          <div className="space-y-4">
            {filteredTxs.length > 0 ? (
              filteredTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-7 rounded-[32px] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`p-4 rounded-2xl ${tx.amount > 0 ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"}`}
                    >
                      {tx.amount > 0 ? (
                        <ArrowDownLeft size={24} />
                      ) : (
                        <ArrowUpRight size={24} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-xl italic font-black text-slate-800">
                          {tx.title}
                        </p>
                        <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full font-black uppercase tracking-tighter">
                          {tx.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold tracking-widest uppercase text-slate-300">
                        {tx.date} • {tx.id}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-2xl font-black font-sans italic ${tx.amount > 0 ? "text-teal-600" : "text-slate-900"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString()}
                      <span className="ml-1 text-sm uppercase opacity-40">
                        {tx.currency}
                      </span>
                    </p>
                    <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mt-1">
                      기록 완료
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 italic font-black tracking-widest text-center text-slate-200">
                개인 거래 데이터가 존재하지 않습니다.
              </div>
            )}
          </div>
        </section>
      </div>
    </CommonLayout>
  );
};

export default PersonalHistory;
