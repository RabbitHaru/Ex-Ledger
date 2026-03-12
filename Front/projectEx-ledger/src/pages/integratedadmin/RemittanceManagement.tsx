import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import http from '../../config/http';
import { RefreshCcw, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

export interface RemittanceHistoryData {
  id: number;
  settlementId: number;
  groupedIds?: number[]; 
  clientName: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: string;
  errorMessage: string;
  attemptCount: number;
  updatedAt: string;
}

const RemittanceManagement: React.FC = () => {
  const [data, setData] = useState<RemittanceHistoryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingText, setProcessingText] = useState<string>("");
  const [resultPopup, setResultPopup] = useState<{isOpen: boolean, type: 'success' | 'partial' | 'error', title: string, desc: string} | null>(null);

  // 🌟 [추가] 검색 관련 상태
  const [searchType, setSearchType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState<boolean>(false);
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const searchTypeMap: { [key: string]: string } = {
    ALL: "전체 검색",
    CLIENT_NAME: "고객명",
    BANK_NAME: "은행명",
    ACCOUNT_NUMBER: "계좌번호",
  };

  const fetchRemittanceHistory = async () => {
    setIsLoading(true);
    try {
      const response: any = await http.get('/admin/settlements/reconciliations?page=0&size=1000');
      if (response && response.data && response.data.status === 'SUCCESS') {
        const result = response.data;

        const failedSettlements = (result.data?.content || []).filter((item: any) => item.status === 'FAILED');

        const mappedData: RemittanceHistoryData[] = failedSettlements.map((item: any) => ({
          id: item.id,
          settlementId: item.id,
          groupedIds: [item.id], 
          clientName: item.clientName,
          bankName: item.bankName || '알 수 없음',
          accountNumber: item.accountNumber || '-',
          amount: item.settlementAmount,
          currency: '원',
          status: item.status,
          errorMessage: '송금망 전송 실패 및 타임아웃',
          attemptCount: 1,
          updatedAt: item.updatedAt
        }));

        const groupedData: RemittanceHistoryData[] = [];
        if (mappedData.length > 0) {
          let currentGroup = mappedData[0];

          for (let i = 1; i < mappedData.length; i++) {
            const row = mappedData[i];

            if (currentGroup.clientName === row.clientName) {
              currentGroup.attemptCount += 1;
              currentGroup.groupedIds!.push(row.settlementId);
            } else {
              groupedData.push(currentGroup);
              currentGroup = row;
            }
          }
          groupedData.push(currentGroup);
        }

        setData(groupedData);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRemittanceHistory();
  }, []);

  // 🌟 [추가] 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setIsSearchTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🌟 [추가] 검색어나 타입 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchType]);

  // 🌟 [추가] 검색 필터링 로직 적용
  const filteredData = data.filter((d) => {
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();

    if (searchType === "CLIENT_NAME") return d.clientName?.toLowerCase().includes(lowerQuery) || false;
    if (searchType === "BANK_NAME") return d.bankName?.toLowerCase().includes(lowerQuery) || false;
    if (searchType === "ACCOUNT_NUMBER") return d.accountNumber?.includes(lowerQuery) || false;

    return (
      d.clientName?.toLowerCase().includes(lowerQuery) ||
      d.bankName?.toLowerCase().includes(lowerQuery) ||
      d.accountNumber?.includes(lowerQuery) || false
    );
  });

  const handleRefresh = async () => {
    setProcessingText("최신 송금 이력 데이터를 불러오는 중입니다...");
    setIsProcessing(true);
    await fetchRemittanceHistory();
    setIsProcessing(false);
    toast.success("데이터 새로고침 완료!"); 
  };

  const handleRetryGroup = async (groupedIds: number[]) => {
    const count = groupedIds.length;
    if (!window.confirm(`선택된 ${count}건의 송금을 일괄 재전송하시겠습니까?`)) return;

    setProcessingText(`총 ${count}건의 송금을 은행망으로 재전송 중입니다...`);
    setIsProcessing(true);

    try {
      const promises = groupedIds.map(id =>
        http.post(`/admin/settlements/${id}/retry`)
      );

      const results: any[] = await Promise.all(promises);
      const successCount = results.filter(r => r && r.data && r.data.status === 'SUCCESS').length;

      setIsProcessing(false);

      if (successCount === count) {
        setResultPopup({
          isOpen: true,
          type: 'success',
          title: '재전송 성공',
          desc: `요청하신 ${count}건의 송금이 모두 은행망으로 정상 재전송되었습니다.`
        });
      } else if (successCount === 0) {
        setResultPopup({
          isOpen: true,
          type: 'error',
          title: '재전송 실패',
          desc: `요청하신 ${count}건 모두 재전송에 실패했습니다. 관리자망 상태를 확인하세요.`
        });
      } else {
        setResultPopup({
          isOpen: true,
          type: 'partial',
          title: '일부 재전송 실패',
          desc: `총 ${count}건 중 ${successCount}건 성공, ${count - successCount}건 실패했습니다.`
        });
      }

      fetchRemittanceHistory();
    } catch (error) {
      setIsProcessing(false);
      setResultPopup({
        isOpen: true,
        type: 'error',
        title: '시스템 오류',
        desc: '서버 통신 중 심각한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">송금 성공</span>;
      case 'FAILED': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      default: return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  // 🌟 [수정] 페이징 기준을 검색된 결과(filteredData)로 변경
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-[1600px]">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-end">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">자동 송금 실패 및 이력 관리</h2>
              <p className="mt-1 text-sm text-gray-500">은행망 오류 등으로 실패한 송금 내역을 확인하고 재전송합니다.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end w-full gap-3 xl:w-auto">
              {/* 🌟 [추가] 검색창 UI */}
              <div className="flex items-center w-full sm:w-[380px] bg-white border border-gray-300 rounded-lg shadow-sm transition focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500 h-[42px]">
                <div className="relative border-r border-gray-300 h-full" ref={searchTypeDropdownRef}>
                  <button
                    onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                    className="flex items-center justify-between w-[110px] h-full px-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-l-lg hover:bg-gray-100 outline-none"
                  >
                    <span>{searchTypeMap[searchType]}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isSearchTypeDropdownOpen && (
                    <div className="absolute left-0 z-20 w-32 py-1 mt-1 bg-white border border-gray-200 rounded-md shadow-lg top-full">
                      {Object.entries(searchTypeMap).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSearchType(key);
                            setIsSearchTypeDropdownOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition hover:bg-teal-50 hover:text-[#007b70]"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex-grow h-full">
                  <span className="absolute text-gray-400 transform -translate-y-1/2 left-2 top-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="검색어를 입력하세요"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-full py-2 pl-8 pr-3 text-sm bg-transparent border-none outline-none rounded-r-lg"
                  />
                </div>
              </div>

           
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                  <th className="px-2 py-4 whitespace-nowrap">기준 ID</th>
                  <th className="px-2 py-4 whitespace-nowrap">최근 발생 일시</th>
                  <th className="px-2 py-4">고객명 (수취 계좌)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">기준 송금액</th>
                  <th className="px-2 py-4">실패 사유 (에러 메시지)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">상태 (누적 에러)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">송금 이력 데이터를 불러오는 중입니다...</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-400 font-medium">
                      <div className="flex flex-col items-center gap-3 justify-center">
                        <FileText size={40} className="text-gray-300" />
                        검색된 송금 이력 내역이 없습니다.
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.map((row) => (
                  <tr key={row.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-2 py-5 text-sm font-medium text-gray-500">#{row.id}</td>
                    <td className="px-2 py-5 text-sm text-gray-500 whitespace-nowrap">{row.updatedAt || "-"}</td>
                    <td className="px-2 py-5">
                      <div className="text-sm font-bold text-gray-800">{row.clientName}</div>
                      <div className="font-mono text-xs text-gray-500 mt-0.5 tabular-nums">
                        {row.bankName} {row.accountNumber}
                      </div>
                    </td>
                    <td className="px-2 py-5 font-semibold text-center text-gray-800">
                      {row.amount?.toLocaleString()}{row.currency}
                    </td>
                    <td className="px-2 py-5">
                      {row.status === 'FAILED' ? (
                        <span className="text-sm text-red-600 truncate max-w-[200px] block" title={row.errorMessage}>
                          {row.errorMessage}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusBadge(row.status)}
                        <span className="text-xs font-bold text-gray-400">{row.attemptCount}건 묶임</span>
                      </div>
                    </td>
                    <td className="px-2 py-5 text-center">
                      {row.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetryGroup(row.groupedIds || [row.settlementId])}
                          className="px-4 py-2 text-xs font-black text-white transition bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 whitespace-nowrap active:scale-95"
                        >
                          일괄 재전송
                        </button>
                      ) : (
                        <button disabled className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded cursor-not-allowed whitespace-nowrap">
                          완료됨
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredData.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition shadow-sm">이전</button>
              <div className="flex gap-1.5 mx-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setCurrentPage(n)} className={`w-9 h-9 rounded-md text-sm font-bold transition shadow-sm ${currentPage === n ? 'bg-[#007b70] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-500'}`}>{n}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition shadow-sm">다음</button>
            </div>
          )}
        </div>
      </main>

      {/* 로딩/진행 중 팝업창 */}
      {isProcessing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-50">
              <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="mb-3 text-xl font-black tracking-tight text-slate-900">
              처리 중...
            </h3>
            <p className="text-sm font-bold leading-relaxed text-slate-500">
              {processingText}<br />
              잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}

      {/* 일괄 재전송 결과(성공/실패) 팝업창 */}
      {resultPopup?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className={`flex items-center justify-center w-20 h-20 mb-6 rounded-full ${
              resultPopup.type === 'success' ? 'bg-green-50 text-green-600' :
              resultPopup.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {resultPopup.type === 'success' && <CheckCircle className="w-10 h-10" />}
              {resultPopup.type === 'error' && <XCircle className="w-10 h-10" />}
              {resultPopup.type === 'partial' && <AlertCircle className="w-10 h-10" />}
            </div>
            <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900">
              {resultPopup.title}
            </h3>
            <p className="mb-8 text-sm font-bold leading-relaxed text-slate-500">
              {resultPopup.desc}
            </p>
            <button
              onClick={() => setResultPopup(null)}
              className={`px-6 py-3 text-base font-black text-white transition rounded-xl shadow-md w-full active:scale-95 ${
                resultPopup.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                resultPopup.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RemittanceManagement;