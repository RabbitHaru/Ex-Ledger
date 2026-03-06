import React, { useState, useEffect } from 'react';
import CommonLayout from "../../components/layout/CommonLayout"; 

export interface RemittanceHistoryData {
  id: number;
  settlementId: number; 
  groupedIds?: number[]; // 🌟 [추가] 묶인 결제 건들의 ID를 담아 일괄 처리에 사용합니다.
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; 

  const fetchRemittanceHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settlements/reconciliations?page=0&size=1000');
      if (response.ok) {
        const result = await response.json();
        
        const failedSettlements = (result.data || []).filter((item: any) => item.status === 'FAILED');

        const mappedData: RemittanceHistoryData[] = failedSettlements.map((item: any) => ({
          id: item.id,
          settlementId: item.id,
          groupedIds: [item.id], // 초기 배열에는 자기 자신의 ID만 들어갑니다.
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

        // 🌟 [핵심] 연속된 동일 고객사 묶기 (Run-Length Encoding 알고리즘)
        const groupedData: RemittanceHistoryData[] = [];
        if (mappedData.length > 0) {
          let currentGroup = mappedData[0];

          for (let i = 1; i < mappedData.length; i++) {
            const row = mappedData[i];
            
            // 이전 행과 고객명이 같으면 그룹으로 묶어 횟수를 올립니다.
            if (currentGroup.clientName === row.clientName) {
              currentGroup.attemptCount += 1;
              currentGroup.groupedIds!.push(row.settlementId); // 재전송용 ID 수집
            } else {
              // 다른 고객사면 지금까지 모은 그룹을 밀어넣고, 새 고객사로 시작합니다.
              groupedData.push(currentGroup);
              currentGroup = row;
            }
          }
          // 마지막으로 남은 그룹도 밀어넣어 줍니다.
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

  // 🌟 [핵심] 여러 건이 묶여있다면 Promise.all을 통해 서버에 일괄 재전송을 때립니다.
  const handleRetryGroup = async (groupedIds: number[]) => {
    const count = groupedIds.length;
    if (!window.confirm(`선택된 ${count}건의 송금을 일괄 재전송하시겠습니까?`)) return;
    
    try {
      // 배열 안의 모든 ID를 반복하여 백엔드로 비동기 API 요청을 날립니다.
      const promises = groupedIds.map(id => 
        fetch(`/api/admin/settlements/${id}/retry`, { method: 'POST' })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === count) {
        alert(`✅ ${count}건 모두 재전송 요청이 완료되었습니다.`);
      } else {
        alert(`⚠️ ${successCount}건 성공, ${count - successCount}건 실패했습니다.`);
      }
      
      fetchRemittanceHistory(); 
    } catch (error) {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">송금 성공</span>;
      case 'FAILED': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      default: return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <CommonLayout>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-7xl">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-end">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">자동 송금 실패 및 이력 관리</h2>
              <p className="mt-1 text-sm text-gray-500">은행망 오류 등으로 실패한 송금 내역을 확인하고 재전송합니다.</p>
            </div>
            
            <div className="flex justify-end w-full lg:w-auto">
              <button 
                onClick={fetchRemittanceHistory} 
                className="px-4 py-2 text-sm font-medium text-white bg-[#007b70] rounded-md shadow-sm hover:bg-teal-800 transition whitespace-nowrap"
              >
                새로고침
              </button>
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
                  <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">송금 실패 또는 이력 내역이 없습니다. 🎉</td></tr>
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
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#007b70] rounded shadow-sm hover:bg-teal-800 transition whitespace-nowrap"
                        >
                          일괄 재전송 🚀
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

          {!isLoading && data.length > 0 && (
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
    </CommonLayout>
  );
};

export default RemittanceManagement;