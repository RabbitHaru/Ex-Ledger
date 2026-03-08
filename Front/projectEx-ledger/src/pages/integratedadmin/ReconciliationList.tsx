import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CommonLayout from "../../components/layout/CommonLayout"; 
// 🌟 1. 우리가 만든 마스터키 불러오기
import { authFetch } from '../../utils/api';

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

// 🌟 긴 결제번호를 축약하는 함수
const shortenOrderId = (id: string) => {
  if (!id) return '-';
  return id.length > 20 ? `${id.substring(0, 12)}...${id.slice(-6)}` : id;
};

const ReconciliationList: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  
  const [searchType, setSearchType] = useState<string>('ALL'); 
  const [searchQuery, setSearchQuery] = useState<string>(''); 
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testStatus, setTestStatus] = useState<string>('PENDING');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10; 

  const [isSearchTypeDropdownOpen, setIsSearchTypeDropdownOpen] = useState<boolean>(false);
  const [isTestDropdownOpen, setIsTestDropdownOpen] = useState<boolean>(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  
  const searchTypeDropdownRef = useRef<HTMLDivElement>(null);
  const testDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const statusKoreanMap: { [key: string]: string } = {
    PENDING: '송금 대기',
    COMPLETED: '정산 완료',
    FAILED: '송금 실패',
  };

  const filterMap: { [key: string]: string } = {
    ALL: '전체 상태 보기',
    ...statusKoreanMap
  };

  const searchTypeMap: { [key: string]: string } = {
    ALL: '전체 검색',
    CLIENT_NAME: '고객명',
    BANK_NAME: '은행명',
    ACCOUNT_NUMBER: '계좌번호',
    ORDER_ID: '결제번호',
  };

  // 🌟 결제번호 복사 함수
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("결제 번호가 복사되었습니다! ✅");
    }).catch(err => {
      console.error('복사 실패:', err);
    });
  };

  const fetchReconciliationData = async () => {
    setIsLoading(true);
    try {
      // 🌟 2. 마스터키(authFetch) 적용 - 토큰 자동 탑재
      const response = await authFetch('/api/admin/settlements/reconciliations?page=0&size=1000');
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
      // 🌟 3. 마스터키(authFetch) 적용
      const response = await authFetch(`/api/admin/settlements/test-data?status=${testStatus}`, { method: 'POST' });
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
      // 🌟 4. 마스터키(authFetch) 적용
      const response = await authFetch(`/api/admin/settlements/${id}/approve`, { method: 'POST' });
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
  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchQuery, searchType]); 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeDropdownRef.current && !searchTypeDropdownRef.current.contains(event.target as Node)) {
        setIsSearchTypeDropdownOpen(false);
      }
      if (testDropdownRef.current && !testDropdownRef.current.contains(event.target as Node)) {
        setIsTestDropdownOpen(false);
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
      case 'COMPLETED': return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">정산 완료</span>;
      case 'PENDING': return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">송금 대기</span>;
      case 'FAILED': return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">송금 실패</span>;
      default: return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
    }
  };

  const handleDetailClick = (row: ReconciliationData) => {
    if (row.status === 'DISCREPANCY' || row.status === 'FAILED') {
      navigate(`/admin/settlement/${row.id}`);
    } else {
      const TARGET_DETAIL_PATH = `/temp-detail-path/${row.id}`; 
      navigate(TARGET_DETAIL_PATH);
    }
  };

  const filteredData = [...data]
    .sort((a, b) => b.id - a.id)
    .filter(d => !(d.clientName === 'Member C' && d.originalAmount === 1000))
    .filter(d => filterStatus === 'ALL' || d.status === filterStatus)
    .filter(d => {
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();

      if (searchType === 'CLIENT_NAME') return d.clientName?.toLowerCase().includes(lowerQuery) || false;
      if (searchType === 'BANK_NAME') return d.bankName?.toLowerCase().includes(lowerQuery) || false;
      if (searchType === 'ACCOUNT_NUMBER') return d.accountNumber?.includes(lowerQuery) || false;
      if (searchType === 'ORDER_ID') return d.orderId?.toLowerCase().includes(lowerQuery) || false;
      
      return (d.clientName?.toLowerCase().includes(lowerQuery) || false) ||
             (d.orderId?.toLowerCase().includes(lowerQuery) || false) ||
             (d.accountNumber?.includes(lowerQuery) || false) ||
             (d.bankName?.toLowerCase().includes(lowerQuery) || false);
    });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <CommonLayout>
      <main className="flex-grow w-full px-4 py-8 mx-auto max-w-7xl">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex flex-col justify-between gap-4 mb-8 xl:flex-row xl:items-end">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">포트원 결제 대사 리스트</h2>
              <p className="mt-1 text-sm text-gray-500">포트원(V2) 결제 내역과 내부 송금 DB를 대조합니다.</p>
            </div>
            
            <div className="flex flex-col items-center w-full gap-3 lg:flex-row lg:justify-end">
              
              <div className="flex items-center w-full sm:w-[380px] bg-white border border-gray-300 rounded-md shadow-sm transition focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500">
                <div className="relative border-r border-gray-300" ref={searchTypeDropdownRef}>
                  <button
                    onClick={() => setIsSearchTypeDropdownOpen(!isSearchTypeDropdownOpen)}
                    className="flex items-center justify-between w-[110px] px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-l-md hover:bg-gray-100 outline-none"
                  >
                    <span>{searchTypeMap[searchType]}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isSearchTypeDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2}
                    >
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

                <div className="relative flex-grow">
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
                    className="w-full py-2 pl-8 pr-3 text-sm bg-transparent border-none outline-none rounded-r-md"
                  />
                </div>
              </div>

              <div className="relative w-full sm:w-auto" ref={filterDropdownRef}>
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm outline-none hover:bg-gray-50 transition min-w-[130px]"
                >
                  <span className="font-medium text-gray-700">{filterMap[filterStatus]}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute right-0 z-20 w-full py-1 mt-1 bg-white border border-gray-200 rounded-md shadow-lg top-full min-w-[130px]">
                    {Object.entries(filterMap).map(([key, value]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setFilterStatus(key);
                          setIsFilterDropdownOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-sm text-left text-gray-700 transition hover:bg-teal-50 hover:text-[#007b70]"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🌟 잃어버렸던 테스트 주입기 UI 완벽 복구 구역 시작 */}
              <div className="flex w-full gap-2 sm:w-auto">
                <select
                  value={testStatus}
                  onChange={(e) => setTestStatus(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm outline-none cursor-pointer hover:bg-gray-50"
                >
                  <option value="PENDING">송금 대기</option>
                  <option value="COMPLETED">정산 완료</option>
                  <option value="FAILED">송금 실패</option>
                  <option value="DISCREPANCY">오차 발생</option>
      
                </select>
                <button 
                  onClick={handleCreateTestData} 
                  className="px-4 py-2 text-sm font-bold text-white transition bg-indigo-600 rounded-md shadow-sm whitespace-nowrap hover:bg-indigo-700"
                >
                  테스트 주입 💉
                </button>
              </div>
              {/* 🌟 복구 구역 끝 */}

              <button onClick={fetchReconciliationData} className="w-full px-4 py-2 text-sm font-medium text-white bg-[#007b70] rounded-md shadow-sm sm:w-auto hover:bg-teal-800 transition whitespace-nowrap">대사 재실행</button>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                  <th className="px-2 py-4 whitespace-nowrap">대사 ID</th>
                  <th className="px-2 py-4 whitespace-nowrap">처리 일시</th>
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
                  <tr><td colSpan={8} className="p-12 font-medium text-center text-gray-400">실시간 데이터를 동기화하는 중입니다...</td></tr>
                ) : paginatedData.length === 0 ? (
                  <tr><td colSpan={8} className="p-12 font-medium text-center text-gray-400">검색된 결제 내역이 없습니다.</td></tr>
                ) : paginatedData.map((row) => (
                  <tr key={row.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-2 py-5 text-sm font-medium text-gray-500">#{row.id}</td>
                    
                    <td className="px-2 py-5 text-sm font-medium text-gray-500 whitespace-nowrap">
                      {row.updatedAt || "-"}
                    </td>

                    <td className="px-2 py-5 font-mono text-sm tracking-tighter text-gray-800">
                      <div className="flex items-center gap-2">
                        <span title={row.orderId} className="underline cursor-help decoration-dotted decoration-gray-300">
                          {shortenOrderId(row.orderId)}
                        </span>
                        <button 
                          onClick={() => handleCopy(row.orderId)}
                          className="p-1 text-gray-400 transition rounded hover:text-teal-600 hover:bg-teal-50"
                          title="전체 번호 복사"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 012-2v-8a2 2 0 01-2-2h-8a2 2 0 01-2 2v8a2 2 0 012 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>

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
                        <button onClick={() => handleDetailClick(row)} className="px-3 py-1.5 text-xs font-bold text-white bg-[#e02424] rounded shadow-sm hover:bg-red-700 transition whitespace-nowrap">원인 분석 / 수정</button>
                      ) : row.status === 'WAITING' ? (
                        <button onClick={() => handleApprove(row.id)} className="px-3 py-1.5 text-xs font-bold text-white bg-purple-600 rounded shadow-sm hover:bg-purple-800 transition whitespace-nowrap">승인하기 ✅</button>
                      ) : (
                        <button onClick={() => handleDetailClick(row)} className="px-4 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition whitespace-nowrap">조회</button>
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
    </CommonLayout>
  );
};

export default ReconciliationList;