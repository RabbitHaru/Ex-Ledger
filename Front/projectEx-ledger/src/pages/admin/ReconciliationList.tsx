import React, { useState, useEffect } from 'react';
import Header from "../../components/layout/Header"; 
import Footer from "../../components/layout/Footer"; 

export interface ReconciliationData {
  id: number;
  orderId: string;
  clientName: string;
  bankName?: string;
  accountNumber?: string;
  originalAmount: number;
  settlementAmount: number;
  status: string; 
  updatedAt: string;
}

const ReconciliationList: React.FC = () => {
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<string>('PENDING');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; 

  // 🌟 '송금 중' 제거
  const statusKoreanMap: { [key: string]: string } = {
    PENDING: '송금 대기',
    COMPLETED: '정산 완료',
    WAITING: '승인 대기',
    FAILED: '송금 실패',
    DISCREPANCY: '오차 발생',
  };

  const fetchReconciliationData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settlements/reconciliations?page=0&size=1000');
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTestData = async () => {
    try {
      const response = await fetch(`/api/admin/settlements/test-data?status=${testStatus}`, { method: 'POST' });
      if (response.ok) {
        const koreanStatus = statusKoreanMap[testStatus] || testStatus;
        alert(`${koreanStatus} 상태의 테스트 데이터가 성공적으로 주입되었습니다! 💉`);
        fetchReconciliationData();
      }
    } catch (error) {
      alert("데이터 주입 중 오류가 발생했습니다.");
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm(`대사 ID #${id} 건의 송금을 승인하시겠습니까?\n승인 시 '송금 대기' 상태로 전환됩니다.`)) return;
    
    try {
      const response = await fetch(`/api/admin/settlements/reconciliations/${id}/approve`, { method: 'POST' });
      if (response.ok) {
        alert("✅ 성공적으로 승인되었습니다.");
        fetchReconciliationData(); 
      } else {
        const err = await response.json();
        alert(`❌ 승인 실패: ${err.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => { fetchReconciliationData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery]); 

  // 🌟 '송금 중(IN_PROGRESS)' 뱃지 로직 제거
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">정산 완료</span>;
      case 'DISCREPANCY': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">오차 발생</span>;
      case 'PENDING': return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">송금 대기</span>;
      case 'FAILED': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      case 'WAITING': return <span className="px-3 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">승인 대기</span>;
      default: return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  const handleDetailClick = (id: number) => {
    alert(`대사 상세 내역 #${id} 건을 조회합니다.`);
  };

  const filteredData = [...data]
    .sort((a, b) => b.id - a.id)
    .filter(d => filterStatus === 'ALL' || d.status === filterStatus)
    .filter(d => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      const matchClientName = d.clientName?.toLowerCase().includes(lowerQuery) || false;
      const matchOrderId = d.orderId?.toLowerCase().includes(lowerQuery) || false;
      const matchAccount = d.accountNumber?.includes(lowerQuery) || false;
      const matchBankName = d.bankName?.toLowerCase().includes(lowerQuery) || false;
      
      return matchClientName || matchOrderId || matchAccount || matchBankName;
    });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50">
      <Header />
      
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-7xl">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col justify-between gap-4 mb-8 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">포트원 결제 대사 리스트</h2>
              <p className="mt-1 text-sm text-gray-500">포트원(V2) 결제 내역과 내부 송금 DB를 대조합니다.</p>
            </div>
            
            <div className="flex flex-col items-center w-full gap-3 sm:flex-row md:w-auto">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="고객명, 은행명, 계좌, 결제번호 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pr-4 text-sm transition border border-gray-300 rounded-md shadow-sm outline-none pl-9 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <span className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 border border-gray-200 rounded-md shadow-inner bg-gray-50">
                <select 
                  className="px-2 py-1 text-xs font-semibold text-teal-700 bg-transparent border-none outline-none cursor-pointer"
                  value={testStatus}
                  onChange={(e) => setTestStatus(e.target.value)}
                >
                  <option value="PENDING">송금 대기</option>
                  <option value="COMPLETED">정산 완료</option>
                  <option value="WAITING">승인 대기</option>
                  <option value="FAILED">송금 실패</option>
                  <option value="DISCREPANCY">오차 발생</option>
                </select>
                <button onClick={handleCreateTestData} className="px-3 py-1 text-xs font-bold text-white bg-[#007b70] rounded hover:bg-teal-800 transition shadow-sm whitespace-nowrap">주입 💉</button>
              </div>

              <select 
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm outline-none focus:ring-1 focus:ring-teal-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">전체 상태 보기</option>
                <option value="PENDING">송금 대기</option>
                <option value="COMPLETED">정산 완료</option>
                <option value="WAITING">승인 대기</option>
                <option value="FAILED">송금 실패</option>
                <option value="DISCREPANCY">오차 발생</option>
              </select>

              <button onClick={fetchReconciliationData} className="px-4 py-2 text-sm font-medium text-white bg-[#007b70] rounded-md shadow-sm hover:bg-teal-800 transition whitespace-nowrap">대사 로직 재실행</button>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                  <th className="px-2 py-4 whitespace-nowrap">대사 ID</th>
                  <th className="px-2 py-4">포트원 결제 번호</th>
                  <th className="px-2 py-4">고객명 (입금 계좌)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">포트원 결제액(A)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">내부 송금액(B)</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">대사 상태</th>
                  <th className="px-2 py-4 text-center whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">실시간 데이터를 동기화하는 중입니다...</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">검색된 결제 내역이 없습니다.</td></tr>
                ) : paginatedData.map((row) => (
                  <tr key={row.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-2 py-5 text-sm font-medium text-gray-500">#{row.id}</td>
                    <td className="px-2 py-5 font-mono text-sm tracking-tighter text-gray-800">{row.orderId}</td>
                    <td className="px-2 py-5">
                        <div className="text-sm font-bold text-gray-800">{row.clientName || "익명 기업"}</div>
                        <div className="font-mono text-xs text-gray-500 mt-0.5 tabular-nums">
                            {row.bankName ? `${row.bankName} ${row.accountNumber}` : "계좌정보 확인중..."}
                        </div>
                    </td>
                    <td className="px-2 py-5 font-semibold text-center text-gray-800">{row.originalAmount?.toLocaleString()}원</td>
                    <td className="px-2 py-5 font-semibold text-center text-gray-800">{row.settlementAmount?.toLocaleString()}원</td>
                    <td className="px-2 py-5 text-center">{getStatusBadge(row.status)}</td>
                    <td className="px-2 py-5 text-center">
                      {row.status === 'DISCREPANCY' || row.status === 'FAILED' ? (
                        <button onClick={() => handleDetailClick(row.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-[#e02424] rounded shadow-sm hover:bg-red-700 transition whitespace-nowrap">원인 분석 / 수정</button>
                      ) : row.status === 'WAITING' ? (
                        <button onClick={() => handleApprove(row.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded shadow-sm hover:bg-purple-800 transition whitespace-nowrap">승인하기 ✅</button>
                      ) : (
                        <button onClick={() => handleDetailClick(row.id)} className="px-4 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition whitespace-nowrap">조회</button>
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

      <Footer />
    </div>
  );
};

export default ReconciliationList;