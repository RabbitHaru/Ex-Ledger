import React, { useState } from "react";
import { useWallet } from "../../context/WalletContext";
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

interface HistoryItem {
  id: string;
  date: string;
  currency: string;
  amount: number;
  rate: number;
  finalKrw: number;
  status: "COMPLETED" | "WAITING" | "FAILED";
  title?: string;
}

const TransactionHistory = () => {
  const { transactions } = useWallet(); // 🌟 전역 데이터 가져오기
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const statusConfig: any = {
    COMPLETED: {
      label: "거래 완료",
      color: "text-teal-600 bg-teal-50",
      icon: <CheckCircle2 size={14} />,
    },
    WAITING: {
      label: "이체 대기",
      color: "text-amber-600 bg-amber-50",
      icon: <Clock size={14} />,
    },
    FAILED: {
      label: "거래 실패",
      color: "text-red-600 bg-red-50",
      icon: <AlertCircle size={14} />,
    },
  };

  const filteredData = transactions.filter((item: any) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.title &&
        item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === "ALL" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="px-6 py-12 mx-auto duration-500 max-w-7xl animate-in fade-in">
      <div className="flex flex-col items-end justify-between gap-6 mb-10 md:flex-row">
        <div className="space-y-2">
          <h1 className="font-sans text-3xl italic font-black tracking-tighter uppercase text-slate-900">
            Transaction History
          </h1>
          <p className="text-[15px] font-medium text-slate-500">
            실시간으로 기록된{" "}
            <span className="font-bold underline text-slate-900 decoration-teal-500">
              거래 내역
            </span>
            을 상세히 조회합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Calendar
              className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400"
              size={16}
            />
            <input
              type="date"
              className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold outline-none shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter
              className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400"
              size={16}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold outline-none cursor-pointer shadow-sm"
            >
              <option value="ALL">모든 상태</option>
              <option value="COMPLETED">거래 완료</option>
              <option value="WAITING">이체 대기</option>
              <option value="FAILED">거래 실패</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative mb-8">
        <Search
          className="absolute -translate-y-1/2 left-5 top-1/2 text-slate-400"
          size={20}
        />
        <input
          type="text"
          placeholder="거래 ID, 수취인 또는 통화로 검색..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 shadow-sm rounded-[24px] text-[15px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
        <table className="w-full font-sans text-left border-collapse">
          <thead className="border-b bg-slate-50/50 border-slate-50">
            <tr className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 py-5">날짜</th>
              <th className="px-8 py-5">거래 ID & 내용</th>
              <th className="px-8 py-5">통화</th>
              <th className="px-8 py-5 text-right">금액</th>
              <th className="px-8 py-5 text-right">환율</th>
              <th className="px-8 py-5 font-black text-right text-slate-900">
                최종 차감 (KRW)
              </th>
              <th className="px-8 py-5 text-center">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[15px]">
            {filteredData.map((item: any) => (
              <tr
                key={item.id}
                className="transition-colors cursor-pointer hover:bg-slate-50/50 group"
              >
                <td className="px-8 py-6 font-bold text-slate-500">
                  {item.date}
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-300" />
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-400">
                        {item.id}
                      </p>
                      <p className="font-black text-slate-700">
                        {item.title || "지갑 이체"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 font-black text-slate-900">
                  {item.currency}
                </td>
                <td className="px-8 py-6 font-mono font-bold text-right">
                  {item.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-8 py-6 font-mono text-right text-slate-400">
                  {item.rate ? item.rate.toLocaleString() : "-"}
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="font-black text-slate-900 text-[17px]">
                    {Math.floor(item.finalKrw || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div
                    className={`mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg w-28 font-black text-[11px] uppercase tracking-tighter ${statusConfig[item.status]?.color || "bg-slate-50"}`}
                  >
                    {statusConfig[item.status]?.icon}
                    {statusConfig[item.status]?.label}
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-20 font-bold text-center text-slate-300"
                >
                  조회된 거래 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistory;
