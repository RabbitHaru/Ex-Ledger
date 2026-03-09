import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface HistoryData {
  date: string;
  rate: number;
  change: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyCode: string;
}

const ExchangeRateHistoryModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  currencyCode,
}) => {
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && currencyCode) {
      const fetchHistory = async () => {
        setLoading(true);
        setError(false);
        try {
          // 백엔드 API 호출 (14일치 데이터 요청)
          const res = await axios.get(
            `http://localhost:8080/api/v1/exchange/history/${currencyCode}?days=14`,
          );
          const rawData = res.data; // 백엔드는 과거 -> 최신순으로 줍니다.

          // 🌟 정렬 및 변동폭 계산 로직
          // 1. 계산을 위해 원본(과거->최신) 리스트를 기반으로 변동액 산출
          const processed = rawData.map((item: any, idx: number) => {
            const prevDay = rawData[idx - 1]; // 이전 인덱스가 더 과거 데이터임
            const changeValue = prevDay ? item.rate - prevDay.rate : 0;
            return {
              date: item.date, // MM-dd 형식
              rate: item.rate,
              change: Number(changeValue.toFixed(2)),
            };
          });

          // 2. 🌟 최신 날짜가 위로 오도록 배열을 뒤집습니다.
          setHistory(processed.reverse());
        } catch (err) {
          console.error("모달 데이터 로드 실패:", err);
          setError(true);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, currencyCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <span className="p-2 text-xs font-black text-white bg-blue-600 rounded-lg">
              {currencyCode}
            </span>
            <h3 className="text-sm font-black tracking-tight text-slate-800">
              최근 환율 이력 (14일)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 transition-all text-slate-400 hover:bg-slate-50 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <RefreshCw className="text-blue-500 animate-spin" size={32} />
              <span className="text-xs font-bold text-slate-400">
                데이터 로드 중...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertCircle className="text-red-400" size={32} />
              <span className="text-sm font-black text-slate-600">
                서버 데이터 조회 실패
              </span>
            </div>
          ) : (
            // 🌟 최신 날짜부터 보이도록 스크롤 영역 제공
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="py-3 text-left">날짜</th>
                    <th className="py-3 text-right">환율 (KRW)</th>
                    <th className="py-3 text-right">변동</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((row, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="py-4 font-bold text-slate-500">
                        {row.date}
                      </td>
                      <td className="py-4 font-black text-right text-slate-900">
                        {row.rate.toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                        })}
                      </td>
                      <td
                        className={`py-4 font-bold text-right flex items-center justify-end gap-1 ${
                          row.change > 0
                            ? "text-red-500"
                            : row.change < 0
                              ? "text-blue-500"
                              : "text-slate-400"
                        }`}
                      >
                        {row.change > 0 ? (
                          <TrendingUp size={12} />
                        ) : row.change < 0 ? (
                          <TrendingDown size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                        {Math.abs(row.change).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/50">
          <button
            onClick={onClose}
            className="w-full py-4 text-sm font-black transition-all bg-white border shadow-sm border-slate-200 text-slate-800 rounded-2xl hover:bg-slate-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateHistoryModal;
