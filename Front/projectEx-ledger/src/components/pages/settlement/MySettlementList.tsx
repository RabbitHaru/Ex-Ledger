import React, { useState, useEffect } from "react";
import CommonLayout from "../../layout/CommonLayout";
import SettlementDetailModal from "./SettlementDetailModal";
import { requestPortonePayment } from "../../../utils/portonePayment";
import { useToast } from "../../../components/notification/ToastProvider";
import {
  Search,
  Filter,
  Download,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  CreditCard,
} from "lucide-react";
import axios from "axios";

type RemittanceStatus =
  | "WAITING"
  | "DISCREPANCY"
  | "WAITING_USER_CONSENT"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

interface SettlementRecord {
  id: string;
  createdAt: string;
  amountUsd: number;
  exchangeRate: number;
  feeBreakdown: {
    platform: number;
    network: number;
    vat: number;
  };
  finalAmountKrw: number;
  status: RemittanceStatus;
}

const MySettlementList = () => {
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SettlementRecord | null>(
    null,
  );
  const { showToast } = useToast();

  const fetchMyRecords = async () => {
    try {
      const response = await axios.get("/api/v1/remittance/my");
      setRecords(response.data);
    } catch (err) {
      const dummy: SettlementRecord[] = [
        {
          id: "TRX-20260305-88A2",
          createdAt: "2026-03-05 15:25",
          amountUsd: 12450,
          exchangeRate: 1456.2,
          feeBreakdown: { platform: 8500, network: 2500, vat: 1000 },
          finalAmountKrw: 18130000,
          status: "WAITING_USER_CONSENT",
        },
        {
          id: "TRX-20260301-77B1",
          createdAt: "2026-03-01 10:10",
          amountUsd: 5200,
          exchangeRate: 1450.0,
          feeBreakdown: { platform: 5000, network: 2500, vat: 1000 },
          finalAmountKrw: 7540000,
          status: "COMPLETED",
        },
      ];
      setRecords(dummy);
    }
  };

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const handlePayment = async () => {
    try {
      await requestPortonePayment({
        amount: 1000, // 테스트 결제 금액
        orderName: "해외 송금 예치금 결제",
        buyerName: "Member C",
        buyerEmail: "member_c@exledger.com",
      });
      showToast("결제가 성공적으로 완료되었습니다.", "SUCCESS");
      fetchMyRecords(); // 목록 새로고침
    } catch (err: any) {
      showToast(err, "ERROR");
    }
  };

  const openDetail = (record: SettlementRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const getStatusStyle = (status: RemittanceStatus) => {
    switch (status) {
      case "COMPLETED":
        return {
          bg: "bg-teal-50",
          text: "text-teal-600",
          label: "정산 완료",
          icon: <CheckCircle size={14} />,
        };
      case "WAITING_USER_CONSENT":
        return {
          bg: "bg-amber-50",
          text: "text-amber-600",
          label: "금액 확인 필요",
          icon: <AlertCircle size={14} />,
        };
      case "PENDING":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          label: "송금 진행 중",
          icon: <Clock size={14} />,
        };
      case "FAILED":
        return {
          bg: "bg-red-50",
          text: "text-red-600",
          label: "처리 실패",
          icon: <AlertCircle size={14} />,
        };
      default:
        return {
          bg: "bg-slate-50",
          text: "text-slate-500",
          label: "승인 대기",
          icon: <Clock size={14} />,
        };
    }
  };

  return (
    <CommonLayout>
      <div className="w-full p-6 mx-auto lg:p-10 max-w-7xl">
        <div className="flex flex-col gap-6 mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 text-white bg-teal-600 rounded-lg shadow-lg shadow-teal-100">
                <Wallet size={20} />
              </div>
              <span className="text-xs font-black tracking-widest text-teal-600 uppercase">
                My History
              </span>
            </div>
            <h1 className="text-4xl italic font-black tracking-tighter text-slate-900">
              Transaction Records
            </h1>
            <p className="mt-2 font-medium text-slate-500">
              본인이 신청한 정산 및 송금 내역을 실시간으로 확인하세요.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePayment}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl"
            >
              <CreditCard size={18} /> 결제 테스트
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl">
              <Download size={18} /> 보고서 다운로드
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-between gap-4 p-8 border-b border-slate-50 md:flex-row">
              <div className="relative w-full md:w-96 group">
                <Search
                  className="absolute transition-colors -translate-y-1/2 left-5 top-1/2 text-slate-300 group-focus-within:text-teal-500"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="결제번호로 검색"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border-none rounded-[20px] text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/10 transition-all placeholder:text-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-100 text-slate-500 rounded-[20px] text-sm font-bold hover:bg-slate-50">
                <Filter size={18} /> 기간 설정
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      신청 일시
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      결제번호
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">
                      송금 신청 (USD)
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">
                      정산 금액 (KRW)
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      상태
                    </th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((item) => {
                    const style = getStatusStyle(item.status);
                    return (
                      <tr
                        key={item.id}
                        className="transition-all hover:bg-slate-50/50 group"
                      >
                        <td className="px-8 py-6 text-sm font-bold text-center text-slate-400">
                          {item.createdAt}
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-center text-slate-900">
                          {item.id}
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-right text-slate-900">
                          $ {item.amountUsd.toLocaleString()}
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-right text-teal-600">
                          {item.finalAmountKrw.toLocaleString()} 원
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center">
                            <span
                              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border ${style.bg} ${style.text} border-current/10`}
                            >
                              {style.icon} {style.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button
                            onClick={() => openDetail(item)}
                            className="p-3 transition-all text-slate-300 hover:text-teal-600 hover:bg-teal-50 rounded-2xl"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <SettlementDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={selectedRecord}
      />
    </CommonLayout>
  );
};

export default MySettlementList;
