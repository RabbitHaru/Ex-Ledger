import React, { useState } from "react";
import CommonLayout from "../layout/CommonLayout";
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ArrowUpDown,
} from "lucide-react";

// Mock Data: 실제 백엔드 API 연동 시 이 부분을 fetch 데이터로 교체합니다.
const MOCK_HISTORY = [
  {
    id: "TRX-20260305-88A2",
    date: "2026-03-05",
    currency: "USD",
    amount: 12450.0,
    rate: 1456.2,
    finalKrw: 18130000,
    status: "COMPLETED",
  },
  {
    id: "TRX-20260302-91B4",
    date: "2026-03-02",
    currency: "JPY",
    amount: 500000,
    rate: 9.12,
    finalKrw: 4560000,
    status: "COMPLETED",
  },
  {
    id: "TRX-20260228-12C7",
    date: "2026-02-28",
    currency: "EUR",
    amount: 3200.5,
    rate: 1532.4,
    finalKrw: 4904446,
    status: "FAILED",
  },
  {
    id: "TRX-20260225-44D9",
    date: "2026-02-25",
    currency: "USD",
    amount: 8500.0,
    rate: 1442.1,
    finalKrw: 12257850,
    status: "COMPLETED",
  },
  {
    id: "TRX-20260220-77E1",
    date: "2026-02-20",
    currency: "GBP",
    amount: 1500.0,
    rate: 1821.5,
    finalKrw: 2732250,
    status: "WAITING",
  },
];

const TransactionHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
    
  // 상태값에 따른 UI 설정
  const statusConfig: any = {
    COMPLETED: {
      label: "정산 완료",
      color: "text-teal-600 bg-teal-50",
      icon: <CheckCircle2 size={14} />,
    },
    WAITING: {
      label: "승인 대기",
      color: "text-amber-600 bg-amber-50",
      icon: <Clock size={14} />,
    },
    FAILED: {
      label: "정산 실패",
      color: "text-red-600 bg-red-50",
      icon: <AlertCircle size={14} />,
    },
  };

  // 필터링 로직
  const filteredData = MOCK_HISTORY.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.currency.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "ALL" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <CommonLayout>
      <div className="px-6 py-12 mx-auto max-w-7xl">
        {/* 헤더 섹션: 페이지 목적 명시 */}
        <div className="flex flex-col items-end justify-between gap-6 mb-10 md:flex-row">
          <div className="space-y-2">
            <h1 className="text-3xl italic font-black tracking-tighter text-slate-900">
              Transaction History
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              필터링 기능을 통해 과거 정산 내역을 상세히 조회할 수 있습니다.
            </p>
          </div>

          {/* 필터 컨트롤 */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Calendar
                className="absolute -translate-y-1/2 left-4 top-1/2 text-slate-400"
                size={16}
              />
              <input
                type="date"
                className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
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
                <option value="COMPLETED">정산 완료</option>
                <option value="WAITING">승인 대기</option>
                <option value="FAILED">정산 실패</option>
              </select>
            </div>
          </div>
        </div>

        {/* 검색창 */}
        <div className="relative mb-8">
          <Search
            className="absolute -translate-y-1/2 left-5 top-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="트랜잭션 ID 또는 통화 코드로 검색..."
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 shadow-sm rounded-[24px] text-[15px] font-bold outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 거래 내역 테이블 */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="border-b bg-slate-50/50 border-slate-50">
              <tr className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">날짜</th>
                <th className="px-8 py-5">트랜잭션 ID</th>
                <th className="px-8 py-5">통화</th>
                <th className="px-8 py-5 text-right">정산 금액</th>
                <th className="px-8 py-5 text-right">적용 환율</th>
                <th className="px-8 py-5 font-black text-right text-slate-900">
                  최종 정산액 (KRW)
                </th>
                <th className="px-8 py-5 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[15px]">
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50/50 group"
                >
                  <td className="px-8 py-6 font-bold text-slate-500">
                    {item.date}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-300" />
                      <span className="font-mono font-bold text-slate-700">
                        {item.id}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-900">
                    {item.currency}
                  </td>
                  <td className="px-8 py-6 font-mono font-bold text-right">
                    {/* 외화 소수점 2자리 유지 */}
                    {item.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-8 py-6 font-mono text-right text-slate-400">
                    {item.rate.toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="font-black text-slate-900 text-[17px]">
                      {/* 원화 소수점 제거 */}
                      {Math.floor(item.finalKrw).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div
                      className={`mx-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg w-28 font-black text-[11px] uppercase tracking-tighter ${statusConfig[item.status].color}`}
                    >
                      {statusConfig[item.status].icon}
                      {statusConfig[item.status].label}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-20 font-bold text-center text-slate-400"
                  >
                    조회된 거래 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CommonLayout>
  );
};

export default TransactionHistory;
