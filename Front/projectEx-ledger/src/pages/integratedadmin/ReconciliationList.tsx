import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../config/http";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";

import SettlementDetailModal from "../../components/pages/settlement/SettlementDetailModal";

export interface ReconciliationData {
  id: number;
  orderId: string;
  clientName: string;
  grade?: "PARTNER" | "GENERAL";
  merchantId?: string;
  bankName?: string;
  accountNumber?: string;
  originalAmount: number;
  settlementAmount: number;
  status: string;
  updatedAt: string;
}

const shortenOrderId = (id: string) => {
  if (!id) return "-";
  return id.length > 20 ? `${id.substring(0, 12)}...${id.slice(-6)}` : id;
};

const ReconciliationList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [searchType, setSearchType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const maxPageButtons = 10;

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState<boolean>(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);

  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const statusKoreanMap: { [key: string]: string } = {
    PENDING: "정산 중",
    COMPLETED: "정산 완료",
    FAILED: "송금 실패",
    REJECTED: "반려 처리",
  };

  const filterMap: { [key: string]: string } = {
    ALL: "전체 상태 보기",
    ...statusKoreanMap,
  };

  const searchTypeMap: { [key: string]: string } = {
    ALL: "전체 검색",
    CLIENT_NAME: "고객명",
    BANK_NAME: "은행명",
    ACCOUNT_NUMBER: "계좌번호",
    ORDER_ID: "결제번호",
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.info("결제 번호가 복사되었습니다!"))
      .catch((err) => console.error("복사 실패:", err));
  };

  const fetchReconciliationData = async () => {
    setIsLoading(true);
    try {
      const response: any = await http.get("/admin/settlements/reconciliations?page=0&size=1000");
      if (response && response.data && response.data.status === "SUCCESS") {
        const result = response.data.data;
        setData(result.content || []);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualReconciliation = async () => {
    setIsProcessing(true);
    await fetchReconciliationData();
    setIsProcessing(false);
  };

  const handleReprocess = async (id: number) => {
    if (!window.confirm("이 반려 건을 다시 정산 중 상태로 되돌리시겠습니까?")) return;
    try {
      const response: any = await http.post(`/admin/settlements/${id}/reprocess`);
      if (response && response.data && response.data.status === "SUCCESS") {
        toast.success("해당 건이 다시 정산 중 상태가 되었습니다.");
        await fetchReconciliationData();
      }
    } catch (error) {
      toast.error("처리에 실패했습니다.");
    }
  };

  // 🌟 [수정] 랜덤 데이터 10개 주입 기능으로 완성
  const handleCreateRandomTestData = async () => {
    setIsProcessing(true);
    try {
      const response: any = await http.post("/admin/settlements/test-data/random?count=10");
      if (response?.data?.status === "SUCCESS") {
        toast.success("랜덤 회사/금액/상태 데이터 10개 주입 완료!");
        await fetchReconciliationData(); 
      }
    } catch (error) {
      toast.error("데이터 주입에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, searchType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">정산 완료</span>;
      case "PENDING":
        return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">정산 중</span>;
      case "FAILED": // 🌟 송금 실패 빨간색 배지 유지
        return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      case "REJECTED":
        return <span className="px-3 py-1 text-xs font-bold text-rose-700 bg-rose-100 rounded-full">반려 처리</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  const getGradeBadge = (grade?: string) => {
    if (grade === "PARTNER") {
      return (
        <span className="ml-2 px-2.5 py-1 text-[11px] font-black bg-indigo-600 text-white rounded-lg shadow-sm shadow-indigo-100 uppercase tracking-wider">
          Partner
        </span>
      );
    }
    return (
      <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded-md">
        일반
      </span>
    );
  };

  const handleDetailClick = async (row: ReconciliationData) => {
    try {
      const response: any = await http.get(`/admin/settlements/${row.id}/receipt`);
      if (response && response.data && response.data.status === "SUCCESS") {
        setSelectedDetail(response.data.data);
        setIsDetailModalOpen(true);
      } else {
        toast.error("영수증 데이터를 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("영수증 조회 실패:", error);
      toast.error("상세 내역을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const filteredData = [...data]
    .sort((a, b) => b.id - a.id)
    .filter((d) => filterStatus === "ALL" || d.status === filterStatus)
    .filter((d) => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      if (searchType === "CLIENT_NAME") return d.clientName?.toLowerCase().includes(lowerQuery) || false;
      if (searchType === "BANK_NAME") return d.bankName?.toLowerCase().includes(lowerQuery) || false;
      if (searchType === "ACCOUNT_NUMBER") return d.accountNumber?.includes(lowerQuery) || false;
      if (searchType === "ORDER_ID") return d.orderId?.toLowerCase().includes(lowerQuery) || false;
      return (
        d.clientName?.toLowerCase().includes(lowerQuery) ||
        d.orderId?.toLowerCase().includes(lowerQuery) ||
        d.accountNumber?.includes(lowerQuery) ||
        d.bankName?.toLowerCase().includes(lowerQuery) || false
      );
    });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const currentGroup = Math.ceil(currentPage / maxPageButtons);
  const startPage = (currentGroup - 1) * maxPageButtons + 1;
  const endPage = Math.min(startPage + maxPageButtons - 1, totalPages);

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) { pageNumbers.push(i); }

  return (
    <>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-[1600px]">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-center">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900"> 결제 대사 리스트</h2>
              <p className="mt-1 text-sm text-gray-500">포트원(V2) 결제 내역과 내부 송금 DB를 대조합니다.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end w-full gap-3 xl:w-auto">
              {/* 검색창 UI (틀 유지) */}
              <div className="flex items-center w-full sm:w-[380px] bg-white border border-gray-300 rounded-md shadow-sm transition focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500">
                <div className="relative border-r border-gray-300" ref={searchTypeDropdownRef}>
                  <button onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)} className="flex items-center justify-between w-[110px] px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-l-md hover:bg-gray-100 outline-none">
                    <span>{searchTypeMap[searchType]}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isSearchTypeDropdownOpen && (
                    <div className="absolute left-0 z-20 w-32 py-1 mt-1 bg-white border border-gray-200 rounded-md shadow-lg top-full">
                      {Object.entries(searchTypeMap).map(([key, value]) => (
                        <button key={key} onClick={() => { setSearchType(key); setIsSearchTypeDropdownOpen(false); }} className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition hover:bg-teal-50 hover:text-[#007b70]">{value}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative flex-grow">
                  <span className="absolute text-gray-400 transform -translate-y-1/2 left-2 top-1/2"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
                  <input type="text" placeholder="검색어를 입력하세요" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full py-2 pl-8 pr-3 text-sm bg-transparent border-none outline-none rounded-r-md" />
                </div>
              </div>

              {/* 필터 드롭다운 (틀 유지) */}
              <div className="relative w-full sm:w-auto" ref={filterDropdownRef}>
                <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm outline-none hover:bg-gray-50 transition min-w-[140px]">
                  <span className="font-medium text-gray-700 whitespace-nowrap">{filterMap[filterStatus]}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isFilterDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 z-20 w-full py-1 mt-1 bg-white border border-gray-200 rounded-md shadow-lg top-full min-w-[140px]">
                    {Object.entries(filterMap).map(([key, value]) => (
                      <button key={key} onClick={() => { setFilterStatus(key); setIsFilterDropdownOpen(false); }} className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition hover:bg-teal-50 hover:text-[#007b70]">{value}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🌟 [수정] 랜덤 데이터 주입 버튼으로 단일화 (디자인 틀 유지) */}
              <button
                onClick={handleCreateRandomTestData}
                className="px-6 h-[38px] text-sm font-black text-white transition bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 active:scale-95 whitespace-nowrap"
              >
                데이터 주입
              </button>

            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                  <th className="px-2 py-4 whitespace-nowrap">대사 ID</th>
                  <th className="px-2 py-4 whitespace-nowrap">처리 일시</th>
                  <th className="px-2 py-4">포트원 결제 번호</th>
                  <th className="px-2 py-4">기업명 (입금 계좌)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">포트원 결제액(A)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">내부 송금액(B)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">대사 상태</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="p-12 font-medium text-center text-gray-400">데이터를 로드하는 중입니다...</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 font-medium text-center text-gray-400">검색된 결제 내역이 없습니다.</td></tr>
                ) : (
                  paginatedData.map((row) => (
                    <tr key={row.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-2 py-5 text-sm font-medium text-gray-500">#{row.id}</td>
                      <td className="px-2 py-5 text-sm font-medium text-gray-500 whitespace-nowrap">{row.updatedAt || "-"}</td>
                      <td className="px-2 py-5 font-mono text-sm tracking-tighter text-gray-800">
                        <div className="flex items-center gap-2">
                          <span title={row.orderId} className="underline cursor-help decoration-dotted decoration-gray-300">{shortenOrderId(row.orderId)}</span>
                          <button onClick={() => handleCopy(row.orderId)} className="p-1 text-gray-400 transition rounded hover:text-teal-600 hover:bg-teal-50"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 01-2-2v-8a2 2 0 01-2 2v8a2 2 0 012 2z" /></svg></button>
                        </div>
                      </td>
                      <td className="px-2 py-5">
                        <div className="flex items-center gap-2"><div className="text-sm font-bold text-gray-800">{row.clientName || "익명 기업"}</div>{getGradeBadge(row.grade)}</div>
                        <div className="font-mono text-xs text-gray-500 mt-0.5 tabular-nums">{row.bankName ? `${row.bankName} ${row.accountNumber}` : "계좌정보 확인중..."}</div>
                      </td>
                      <td className="px-2 py-5 font-semibold text-center text-gray-800">{row.originalAmount?.toLocaleString()}원</td>
                      <td className="px-2 py-5 font-semibold text-center text-gray-800">{row.settlementAmount?.toLocaleString()}원{row.status === "PENDING" && <span className="block text-xs font-bold text-gray-800">(예정)</span>}</td>
                      <td className="px-2 py-5 text-center">{getStatusBadge(row.status)}</td>
                      <td className="px-2 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* 🌟 [유지] FAILED일 땐 조회 대신 빨간색 송금 관리 버튼만 노출 */}
                          {row.status === "FAILED" ? (
                            <button
                              onClick={() => navigate("/remittance")}
                              className="px-3 py-1.5 text-xs font-black text-white bg-red-600 rounded hover:bg-red-700 transition shadow-sm whitespace-nowrap"
                            >
                              송금 관리
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDetailClick(row)}
                              className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition whitespace-nowrap"
                            >
                              조회
                            </button>
                          )}
                          {row.status === "REJECTED" && (
                            <button onClick={() => handleReprocess(row.id)} className="px-3 py-1.5 text-xs font-black text-white bg-indigo-600 rounded hover:bg-indigo-700 transition shadow-sm whitespace-nowrap">정산 재개</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredData.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button onClick={() => setCurrentPage(startPage - 1)} disabled={startPage === 1} className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition shadow-sm">이전</button>
              <div className="flex gap-1.5 mx-2">{pageNumbers.map((n) => (<button key={n} onClick={() => setCurrentPage(n)} className={`w-9 h-9 rounded-md text-sm font-bold transition shadow-sm ${currentPage === n ? "bg-[#007b70] text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-teal-500"}`}>{n}</button>))}</div>
              <button onClick={() => setCurrentPage(endPage + 1)} disabled={endPage === totalPages} className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition shadow-sm">다음</button>
            </div>
          )}
        </div>
      </main>

      <SettlementDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} data={selectedDetail} />

      {isProcessing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-50"><RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" /></div>
            <h3 className="mb-3 text-xl font-black tracking-tight text-slate-900">플랫폼 데이터 처리 중...</h3>
            <p className="text-sm font-bold leading-relaxed text-slate-500">대사 재실행 및 테스트 데이터 주입이 진행 중입니다.<br />잠시만 기다려 주세요.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ReconciliationList;