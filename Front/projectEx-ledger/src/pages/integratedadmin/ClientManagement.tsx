import React, { useState, useEffect } from 'react';
import CommonLayout from "../../components/layout/CommonLayout";

interface Client {
  merchantId: string;
  name: string;
  status: string;
  joinDate: string;
  grade: 'GENERAL' | 'VIP'; 
}

interface SettlementPolicy {
  platformFeeRate: string;
  networkFee: string;
  exchangeSpread: string;
  preferenceRate: string;
}

const fallbackClients: Client[] = [
  { merchantId: 'MERCHANT-001', name: '(주)무신사', status: 'ACTIVE', joinDate: '2025-01-15', grade: 'VIP' },
  { merchantId: 'MERCHANT-002', name: '우아한형제들', status: 'ACTIVE', joinDate: '2025-02-20', grade: 'GENERAL' },
  { merchantId: 'MERCHANT-003', name: '당근마켓', status: 'PENDING', joinDate: '2026-03-01', grade: 'GENERAL' },
  { merchantId: 'MERCHANT-004', name: '쿠팡페이', status: 'ACTIVE', joinDate: '2026-03-02', grade: 'VIP' },
  { merchantId: 'MERCHANT-005', name: '오늘의집', status: 'ACTIVE', joinDate: '2026-03-03', grade: 'GENERAL' },
  { merchantId: 'MERCHANT-006', name: '(주)로켓상사', status: 'ACTIVE', joinDate: '2026-03-04', grade: 'GENERAL' },
  { merchantId: 'MERCHANT-007', name: '글로벌페이', status: 'ACTIVE', joinDate: '2026-03-05', grade: 'VIP' },
  { merchantId: 'MERCHANT-008', name: '초록마켓', status: 'ACTIVE', joinDate: '2026-03-05', grade: 'GENERAL' },
  { merchantId: 'MERCHANT-009', name: '야놀자', status: 'ACTIVE', joinDate: '2026-03-06', grade: 'VIP' },
  { merchantId: 'MERCHANT-010', name: '네이버페이', status: 'ACTIVE', joinDate: '2026-03-06', grade: 'VIP' },
];

// 🌟 [추가] 상태값을 한글로 변환하고 예쁜 색상을 입혀주는 헬퍼 함수
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED': 
      return <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">승인 완료</span>;
    case 'PENDING': 
      return <span className="px-3 py-1 text-xs font-bold rounded-full text-amber-700 bg-amber-100">승인 대기</span>;
    case 'ACTIVE': 
      return <span className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">활성 (임시)</span>;
    case 'SUSPENDED': 
      return <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">이용 정지</span>;
    default: 
      return <span className="px-3 py-1 text-xs font-bold text-gray-700 bg-gray-200 rounded-full">{status}</span>;
  }
};

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [policyData, setPolicyData] = useState<SettlementPolicy>({
    platformFeeRate: '',
    networkFee: '',
    exchangeSpread: '',
    preferenceRate: '',
  });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/clients');
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setClients(result.data);
        } else {
          setClients(fallbackClients);
        }
      } else {
        setClients(fallbackClients);
      }
    } catch (error) {
      setClients(fallbackClients); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const applyGradeDefaults = (grade: 'GENERAL' | 'VIP') => {
    if (grade === 'VIP') {
      setPolicyData({
        platformFeeRate: '0.005',   
        networkFee: '0',            
        exchangeSpread: '2.0',      
        preferenceRate: '1.0',      
      });
    } else {
      setPolicyData({
        platformFeeRate: '0.015',   
        networkFee: '2000',         
        exchangeSpread: '10.0',     
        preferenceRate: '0.90',     
      });
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    applyGradeDefaults(client.grade);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPolicyData(prev => ({ ...prev, [name]: value }));
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value as 'GENERAL' | 'VIP';
    
    if (selectedClient) {
      setSelectedClient({ ...selectedClient, grade: newGrade });
      applyGradeDefaults(newGrade);
      setClients(prevClients => 
        prevClients.map(client => 
          client.merchantId === selectedClient.merchantId 
            ? { ...client, grade: newGrade } 
            : client
        )
      );
    }
  };

  const handleSavePolicy = async () => {
    if (!selectedClient) return;
    
    if (!window.confirm(`${selectedClient.name}의 등급(${selectedClient.grade})과 수수료 정책을 업데이트 하시겠습니까?`)) return;

    try {
      const response = await fetch(`http://localhost:8080/api/admin/clients/${selectedClient.merchantId}/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: selectedClient.grade, 
          platformFeeRate: parseFloat(policyData.platformFeeRate),
          networkFee: parseFloat(policyData.networkFee),
          exchangeSpread: parseFloat(policyData.exchangeSpread),
          preferenceRate: parseFloat(policyData.preferenceRate),
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'SUCCESS') {
        alert('✅ 가맹점 등급 및 수수료 정책이 성공적으로 반영되었습니다!');
      } else {
        alert(`❌ 업데이트 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 통신 에러:', error);
      alert('서버와 통신 중 문제가 발생했습니다. 백엔드가 켜져있는지 확인해주세요!');
    }
  };

  return (
    <CommonLayout>
      <main className="w-full px-4 py-8 mx-auto max-w-7xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">🏢 기업 고객 및 수수료 정책 관리</h2>
        
        <div className="flex flex-col gap-6 lg:flex-row">
          
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 shadow-sm rounded-xl p-6 min-h-[500px]">
            <h3 className="mb-4 text-lg font-bold text-gray-800">가맹점 목록</h3>
            {isLoading ? (
              <div className="py-10 text-center text-gray-400">데이터를 불러오는 중입니다...</div>
            ) : clients.length === 0 ? (
              <div className="py-10 text-center text-gray-400">등록된 가맹점이 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {clients.map(client => (
                  <li key={client.merchantId}>
                    <button
                      onClick={() => handleClientSelect(client)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                        selectedClient?.merchantId === client.merchantId
                          ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{client.name}</span>
                        {client.grade === 'VIP' && (
                          <span className="px-2 py-0.5 text-[10px] font-black text-amber-700 bg-amber-100 rounded-md">👑 VIP</span>
                        )}
                      </div>
                      <div className="mt-1 font-mono text-xs text-gray-500">{client.merchantId}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-full p-6 bg-white border border-gray-200 shadow-sm lg:w-2/3 rounded-xl">
            {selectedClient ? (
              <div>
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <h3 className="flex items-center gap-3 text-lg font-bold text-gray-800">
                    <span className="text-teal-600">{selectedClient.name}</span> 
                    
                    <select 
                      value={selectedClient.grade} 
                      onChange={handleGradeChange}
                      className={`text-sm font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer ${
                        selectedClient.grade === 'VIP' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      <option value="GENERAL">일반 등급</option>
                      <option value="VIP">👑 VIP 등급</option>
                    </select>
                  </h3>
                  
                  {/* 🌟 [수정됨] 여기서 한글 배지 함수를 호출합니다 */}
                  {getStatusBadge(selectedClient.status)}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <label className="block mb-2 text-sm font-bold text-gray-700">
                      플랫폼 중개 수수료율 (ex. 1.5% = 0.015)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      name="platformFeeRate"
                      value={policyData.platformFeeRate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <label className="block mb-2 text-sm font-bold text-gray-700">
                      네트워크/전신료 고정비 (KRW)
                    </label>
                    <input
                      type="number"
                      name="networkFee"
                      value={policyData.networkFee}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <label className="block mb-2 text-sm font-bold text-gray-700">
                      환전 스프레드 마진 (1 USD 당)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="exchangeSpread"
                      value={policyData.exchangeSpread}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <label className="block mb-2 text-sm font-bold text-gray-700">
                      환율 우대율 (ex. 90% = 0.90)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="preferenceRate"
                      value={policyData.preferenceRate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="mt-8 text-right">
                  <button
                    onClick={handleSavePolicy}
                    className="px-6 py-3 font-bold text-white transition bg-teal-600 rounded-md shadow-sm hover:bg-teal-700"
                  >
                    정책 저장 및 적용
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[400px] text-gray-400">
                <p>가맹점을 선택하면 수수료 정책을 관리할 수 있습니다.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </CommonLayout>
  );
}