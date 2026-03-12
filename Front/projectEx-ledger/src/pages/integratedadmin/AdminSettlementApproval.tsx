import React, { useState, useEffect, useRef } from "react";
import http from "../../config/http";

interface ApprovalData {
  id: number;
  orderId: string;
  clientName: string;
  amount: number;
  currency: string;
  settlementAmount: number;
  status: string;
  updatedAt: string;
}

const AdminSettlementApproval: React.FC = () => {
  const [data, setData] = useState<ApprovalData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingText, setProcessingText] = useState<string>("");
  const [resultPopup, setResultPopup] = useState<{isOpen: boolean, type: 'success' | 'partial' | 'error', title: string, desc: string} | null>(null);

  const [searchType, setSearchType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState<boolean>(false);
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);

  // 🌟 [추가] 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const searchTypeMap: { [key: string]: string } = {
    ALL: "전체 검색",
    CLIENT_NAME: "기업명",
    ORDER_ID: "결제번호",
  };

  const fetchApprovalList = async () => {
    setIsLoading(true);
    try {
      const response: any = await http.get("/admin/settlements/reconciliations?page=0&size=1000");
      if (response?.data?.status === "SUCCESS") {
        const content = response.data.data.content || [];
        const pendingData = content.filter((item: any) => item.status === "PENDING"); 
        setData(pendingData);
      }
    } catch (error) {
      window.alert("정산 중 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setIsSearchTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1); // 🌟 [추가] 검색어나 타입이 바뀌면 1페이지로 리셋
  }, [searchQuery, searchType]);

  const filteredData = data.filter((d) => {
    if (!searchQuery.trim()) return true;
    const lowerQuery = searchQuery.toLowerCase();

    if (searchType === "CLIENT_NAME") return d.clientName?.toLowerCase().includes(lowerQuery) || false;
    if (searchType === "ORDER_ID") return d.orderId?.toLowerCase().includes(lowerQuery) || false;

    return (
      d.clientName?.toLowerCase().includes(lowerQuery) ||
      d.orderId?.toLowerCase().includes(lowerQuery) || false
    );
  });

  // 🌟 [추가] 페이징 데이터 계산
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 🌟 [수정] 전체 선택 시 '현재 페이지'에 보이는 항목들만 선택/해제되도록 수정
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentPageIds = paginatedData.map(item => item.id);
    
    if (e.target.checked) {
      // 기존 선택된 항목에 현재 페이지 항목 추가 (중복 제거)
      const newSelectedIds = Array.from(new Set([...selectedIds, ...currentPageIds]));
      setSelectedIds(newSelectedIds);
    } else {
      // 기존 선택된 항목에서 현재 페이지 항목만 제거
      setSelectedIds(selectedIds.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 현재 페이지의 모든 항목이 선택되었는지 확인하는 로직 (헤더 체크박스 상태용)
  const isAllCurrentPageSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(item.id));

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      window.alert("승인할 항목을 선택해주세요.");
      return;
    }

    if (!window.confirm(`선택한 ${selectedIds.length}건의 정산을 승인하시겠습니까?`)) return;

    setProcessingText(`총 ${selectedIds.length}건의 승인 처리를 진행 중입니다...`);
    setIsProcessing(true);
    
    try {
      const promises = selectedIds.map((id) => http.post(`/admin/settlements/${id}/approve`));
      await Promise.all(promises);

      setData((prevData) => prevData.filter((item) => !selectedIds.includes(item.id)));
      
      setIsProcessing(false);
      setResultPopup({
        isOpen: true,
        type: 'success',
        title: '승인 성공',
        desc: `선택하신 ${selectedIds.length}건의 정산이 모두 정상적으로 승인 완료되었습니다.`
      });
      setSelectedIds([]);
      
      // 🌟 [추가] 승인 후 현재 페이지가 비어있게 되면 이전 페이지로 이동
      if (paginatedData.length === selectedIds.length && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      setIsProcessing(false);
      setResultPopup({
        isOpen: true,
        type: 'error',
        title: '승인 실패',
        desc: '일부 항목을 승인하는 도중 시스템 오류가 발생했습니다.'
      });
    }
  };

 const handleReject = async (id: number) => {
    const reason = window.prompt("반려 사유를 입력해주세요.");
    
    if (reason === null) return;
    if (!reason.trim()) {
      window.alert("반려 사유를 입력해야 합니다.");
      return;
    }

    try {
      await http.post(`/admin/settlements/${id}/reject`, { reason });
      window.alert("반려 처리가 완료되었습니다.");
      
      setData(prevData => prevData.filter(item => item.id !== id));
      
      // 🌟 [추가] 반려 후 현재 페이지가 비어있게 되면 이전 페이지로 이동
      if (paginatedData.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      window.alert("반려 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-[1400px]">
        <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900"> 정산 승인 관리</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              기업 가맹점의 정산 요청 내역을 검토하고 송금을 승인합니다.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center w-full sm:w-[400px] bg-white border border-slate-300 rounded-xl shadow-sm transition focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 h-[42px]">
              <div className="relative h-full border-r border-slate-200" ref={searchTypeDropdownRef}>
                <button
                  onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                  className="flex items-center justify-between w-[130px] h-full px-3 text-sm font-medium whitespace-nowrap outline-none text-slate-600 bg-slate-50 rounded-l-xl hover:bg-slate-100"
                >
                  <span>{searchTypeMap[searchType]}</span>
                  <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {isSearchTypeDropdownOpen && (
                  <div className="absolute left-0 z-20 w-32 py-1 mt-1 bg-white border rounded-lg shadow-lg border-slate-200 top-full">
                    {Object.entries(searchTypeMap).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSearchType(key);
                          setIsSearchTypeDropdownOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-sm text-left transition whitespace-nowrap text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative flex-grow h-full">
                <input
                  type="text"
                  placeholder="검색어 입력"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full px-4 py-2 text-sm bg-transparent border-none outline-none rounded-r-xl"
                />
              </div>
            </div>

           
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing || selectedIds.length === 0}
              className="flex items-center justify-center px-6 h-[42px] text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              선택 항목 일괄 승인 ({selectedIds.length})
            </button>
          </div>
        </div>

        <div className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl">
          <div className="overflow-x-auto min-h-[500px] flex flex-col justify-between">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 border-slate-200">
                  <th className="w-16 p-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer focus:ring-indigo-500"
                      checked={isAllCurrentPageSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest uppercase text-slate-500">요청 일시</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest uppercase text-slate-500">기업명</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-right uppercase text-slate-500">신청 원금</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-right uppercase text-slate-500">최종 정산액(원)</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-center uppercase text-slate-500">상태</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-center uppercase text-slate-500">개별 액션</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-20 font-medium text-center text-slate-400">
                      데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 font-medium text-center whitespace-nowrap text-slate-500">
                      검색된 승인 대기 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  // 🌟 [수정] filteredData 대신 paginatedData를 매핑합니다.
                  paginatedData.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 transition hover:bg-slate-50/50 ${
                        selectedIds.includes(row.id) ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer focus:ring-indigo-500"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleSelectOne(row.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                        {row.updatedAt || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{row.clientName}</div>
                        <div className="text-xs font-mono mt-0.5 text-slate-400">{row.orderId}</div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-600">
                          {row.amount?.toLocaleString()} <span className="text-xs font-black">{row.currency}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-lg font-black text-teal-600">
                          {row.settlementAmount?.toLocaleString()} <span className="text-sm font-bold text-teal-600">원</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 text-xs font-black rounded-full whitespace-nowrap text-amber-700 bg-amber-100">
                          정산 중
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleReject(row.id)}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 transition rounded-lg bg-red-50 hover:bg-red-100"
                          >
                            반려
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* 🌟 [추가] 하단 페이징 컨트롤 컴포넌트 */}
            {!isLoading && filteredData.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-6 mt-auto border-t border-slate-100">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                  disabled={currentPage === 1} 
                  className="px-4 py-1.5 border border-slate-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-slate-50 transition shadow-sm"
                >
                  이전
                </button>
                <div className="flex gap-1.5 mx-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button 
                      key={n} 
                      onClick={() => setCurrentPage(n)} 
                      className={`w-9 h-9 rounded-md text-sm font-bold transition shadow-sm ${
                        currentPage === n 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                  disabled={currentPage === totalPages} 
                  className="px-4 py-1.5 border border-slate-300 rounded-md text-sm font-medium disabled:opacity-30 hover:bg-slate-50 transition shadow-sm"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 팝업 UI는 기존과 동일하게 유지 */}
      {isProcessing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-16 h-16 mb-6">
              <div className="w-12 h-12 border-4 rounded-full border-indigo-100 border-t-indigo-600 animate-spin"></div>
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

      {resultPopup?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <h3 className={`mb-4 text-2xl font-black tracking-tight ${
              resultPopup.type === 'success' ? 'text-green-600' :
              resultPopup.type === 'error' ? 'text-red-600' : 'text-orange-600'
            }`}>
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

export default AdminSettlementApproval;