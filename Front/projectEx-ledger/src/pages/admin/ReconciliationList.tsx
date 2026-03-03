import React, { useState, useEffect } from 'react';

// 1. 대사 데이터 인터페이스 정의
export interface ReconciliationData {
  id: number;
  orderId: string;
  clientName: string;
  originalAmount: number;
  settlementAmount: number;
  status: string; 
  updatedAt: string;
}

const ReconciliationList: React.FC = () => {
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // 주입할 테스트 데이터의 상태 선택
  const [testStatus, setTestStatus] = useState<string>('PENDING');

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; 

  // 영어 상태값을 한글로 바꿔주는 매핑 테이블
  const statusKoreanMap: { [key: string]: string } = {
    PENDING: '송금 대기',
    IN_PROGRESS: '송금 중',
    COMPLETED: '정산 완료',
    WAITING: '승인 대기',
    FAILED: '송금 실패',
    DISCREPANCY: '오차 발생',
  };

  // 데이터 로드
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

  // 🚨 [수정] 따옴표와 [확인] 문구를 제거한 깔끔한 알림창
  const handleCreateTestData = async () => {
    try {
      const response = await fetch(`/api/admin/settlements/test-data?status=${testStatus}`, { method: 'POST' });
      if (response.ok) {
        const koreanStatus = statusKoreanMap[testStatus] || testStatus;
        // 요청하신 대로 대괄호와 따옴표를 없앴습니다!
        alert(`${koreanStatus} 상태의 테스트 데이터가 성공적으로 주입되었습니다! 💉`);
        fetchReconciliationData();
      }
    } catch (error) {
      alert("데이터 주입 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // 상태 뱃지 설정
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">정산 완료</span>;
      case 'DISCREPANCY': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">오차 발생</span>;
      case 'PENDING': return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">송금 대기</span>;
      case 'IN_PROGRESS': return <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">송금 중</span>;
      case 'FAILED': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      case 'WAITING': return <span className="px-3 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">승인 대기</span>;
      default: return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  // 상세 보기 알림창도 깔끔하게 정리
  const handleDetailClick = (id: number) => {
    alert(`대사 상세 내역 #${id} 건을 조회합니다.`);
  };

  const filteredData = [...data]
    .sort((a, b) => b.id - a.id)
    .filter(d => filterStatus === 'ALL' || d.status === filterStatus);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">포트원 결제 대사 리스트</h2>
          <p className="mt-1 text-sm text-gray-500">포트원(V2) 결제 내역과 내부 송금 DB를 대조합니다.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 테스트 데이터 주입기 섹션 */}
          <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-md shadow-inner">
            <select 
              className="px-2 py-1 text-xs border-none bg-transparent outline-none font-semibold text-teal-700 cursor-pointer"
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value)}
            >
              <option value="PENDING">송금 대기</option>
              <option value="IN_PROGRESS">송금 중</option>
              <option value="COMPLETED">정산 완료</option>
              <option value="WAITING">승인 대기</option>
              <option value="FAILED">송금 실패</option>
              <option value="DISCREPANCY">오차 발생</option>
            </select>
            <button 
              onClick={handleCreateTestData} 
              className="px-3 py-1 text-xs font-bold text-white bg-[#007b70] rounded hover:bg-teal-800 transition shadow-sm"
            >
              주입 💉
            </button>
          </div>

          {/* 생략: 필터 및 테이블 렌더링 (이전과 동일) */}
          <select 
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-teal-500 outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">전체 상태 보기</option>
            <option value="PENDING">송금 대기</option>
            <option value="IN_PROGRESS">송금 중</option>
            <option value="COMPLETED">정산 완료</option>
            <option value="WAITING">승인 대기</option>
            <option value="FAILED">송금 실패</option>
            <option value="DISCREPANCY">오차 발생</option>
          </select>

          <button onClick={fetchReconciliationData} className="px-4 py-2 text-sm font-medium text-white bg-[#007b70] rounded-md shadow-sm hover:bg-teal-800 transition">
            대사 로직 재실행
          </button>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-sm font-semibold text-gray-600 border-b border-t border-gray-100 bg-gray-50/50">
              <th className="py-4 px-2">대사 ID</th>
              <th className="py-4 px-2">포트원 결제 번호</th>
              <th className="py-4 px-2">내부 송금 번호 (고객명)</th>
              <th className="py-4 px-2 text-center">포트원 결제액(A)</th>
              <th className="py-4 px-2 text-center">내부 송금액(B)</th>
              <th className="py-4 px-2 text-center">대사 상태</th>
              <th className="py-4 px-2 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-12 text-center text-gray-400 font-medium">실시간 데이터를 동기화하는 중입니다...</td></tr>
            ) : paginatedData.map((row) => (
              <tr key={row.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                <td className="py-5 px-2 text-sm text-gray-500 font-medium">#{row.id}</td>
                <td className="py-5 px-2 font-mono text-sm text-gray-800 tracking-tighter">{row.orderId}</td>
                <td className="py-5 px-2 text-sm text-gray-800 font-medium">{row.clientName || "익명 기업"}</td>
                <td className="py-5 px-2 font-semibold text-center text-gray-800">{row.originalAmount?.toLocaleString()}원</td>
                <td className="py-5 px-2 font-semibold text-center text-gray-800">{row.settlementAmount?.toLocaleString()}원</td>
                <td className="py-5 px-2 text-center">{getStatusBadge(row.status)}</td>
                <td className="py-5 px-2 text-center">
                  {(row.status === 'DISCREPANCY' || row.status === 'FAILED') ? (
                    <button 
                      onClick={() => handleDetailClick(row.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#e02424] rounded shadow-sm hover:bg-red-700 transition"
                    >
                      원인 분석 / 수정
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleDetailClick(row.id)}
                      className="px-4 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition"
                    >
                      조회
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이징 섹션 */}
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
  );
};

export default ReconciliationList;