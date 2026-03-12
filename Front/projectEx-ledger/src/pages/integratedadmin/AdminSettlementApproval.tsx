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
        // PENDING(정산 중) 상태만 가져옵니다.
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredData.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 🌟 [수정] 승인 완료 시 흐려지지 않고 "즉시 목록에서 사라지도록" 필터링 처리
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

      // 데이터에서 선택된(승인된) 항목들을 아예 삭제해 버립니다!
      setData((prevData) => prevData.filter((item) => !selectedIds.includes(item.id)));
      
      setIsProcessing(false);
      setResultPopup({
        isOpen: true,
        type: 'success',
        title: '승인 성공',
        desc: `선택하신 ${selectedIds.length}건의 정산이 모두 정상적으로 승인 완료되었습니다.`
      });
      setSelectedIds([]);
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
    
    if (reason === null) return; // 취소 버튼 클릭 시
    if (!reason.trim()) {
      window.alert("반려 사유를 입력해야 합니다.");
      return;
    }

    try {
      // 백엔드로 반려 사유 전송 (POST 요청)
      await http.post(`/admin/settlements/${id}/reject`, { reason });
      
      window.alert("반려 처리가 완료되었습니다.");
      
      // 화면에서 즉시 제거
      setData(prevData => prevData.filter(item => item.id !== id));
    } catch (error) {
      window.alert("반려 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-[1400px]">
        <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">B2B 정산 승인 관리</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              기업 가맹점의 정산 요청 내역을 검토하고 송금을 승인합니다.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* 🌟 [수정] 검색창 전체 너비를 400px로 넉넉하게 확장! */}
            <div className="flex items-center w-full sm:w-[400px] bg-white border border-slate-300 rounded-xl shadow-sm transition focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 h-[42px]">
              <div className="relative border-r border-slate-200 h-full" ref={searchTypeDropdownRef}>
                {/* 🌟 [수정] 드롭다운 버튼 너비도 130px로 넓혀서 무조건 한 줄 유지 */}
                <button
                  onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                  className="flex items-center justify-between w-[130px] h-full px-3 text-sm font-medium text-slate-600 bg-slate-50 rounded-l-xl hover:bg-slate-100 outline-none whitespace-nowrap"
                >
                  <span>{searchTypeMap[searchType]}</span>
                  <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isSearchTypeDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {isSearchTypeDropdownOpen && (
                  <div className="absolute left-0 z-20 w-32 py-1 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg top-full">
                    {Object.entries(searchTypeMap).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSearchType(key);
                          setIsSearchTypeDropdownOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-sm text-left text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 whitespace-nowrap"
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
                  className="w-full h-full py-2 px-4 text-sm bg-transparent border-none outline-none rounded-r-xl"
                />
              </div>
            </div>

            <button
              onClick={fetchApprovalList}
              className="px-4 h-[42px] text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm flex items-center"
            >
              새로고침
            </button>
            <button
              onClick={handleBulkApprove}
              disabled={isProcessing || selectedIds.length === 0}
              className="flex items-center justify-center px-6 h-[42px] text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              선택 항목 일괄 승인 ({selectedIds.length})
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[500px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-center w-16">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer focus:ring-indigo-500"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredData.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase">요청 일시</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase">기업명 (B2B)</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase text-right">신청 원금</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase text-right">최종 정산액(원)</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase text-center">상태</th>
                  <th className="px-4 py-4 text-xs font-black tracking-widest text-slate-500 uppercase text-center">개별 액션</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-400 font-medium">
                      데이터를 불러오는 중입니다...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center text-slate-500 font-medium whitespace-nowrap">
                      검색된 승인 대기 건이 없습니다.
                    </td>
                  </tr>
                ) : (
                  // 🌟 [수정] 불필요해진 완료(COMPLETED) 관련 렌더링 조건 싹 제거! (어차피 목록에서 바로 사라짐)
                  filteredData.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 transition hover:bg-slate-50/50 ${
                        selectedIds.includes(row.id) ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 focus:ring-indigo-500 text-indigo-600 cursor-pointer"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => handleSelectOne(row.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-500 whitespace-nowrap">
                        {row.updatedAt || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">{row.clientName}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">{row.orderId}</div>
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
                        <span className="px-3 py-1 text-xs font-black text-amber-700 bg-amber-100 rounded-full whitespace-nowrap">
                          정산 중
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleReject(row.id)}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
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
          </div>
        </div>
      </main>

      {isProcessing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-16 h-16 mb-6">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
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