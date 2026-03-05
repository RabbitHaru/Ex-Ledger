import React, { useState, useEffect } from 'react';
import CommonLayout from "../../components/layout/CommonLayout";

// 가맹점 기본 정보 타입
interface Client {
  merchantId: string;
  name: string;
  status: string;
  joinDate: string;
}

// 🌟 수수료 정책 데이터 타입 (백엔드 DTO와 일치)
interface SettlementPolicy {
  platformFeeRate: string;
  networkFee: string;
  exchangeSpread: string;
  preferenceRate: string;
}

export default function ClientManagement() {
  // 1. 임시 가맹점 데이터 (추후 백엔드 가맹점 조회 API와 연동 필요)
  const mockClients: Client[] = [
    { merchantId: 'MERCHANT-001', name: '(주)무신사', status: 'ACTIVE', joinDate: '2025-01-15' },
    { merchantId: 'MERCHANT-002', name: '우아한형제들', status: 'ACTIVE', joinDate: '2025-02-20' },
    { merchantId: 'MERCHANT-003', name: '당근마켓', status: 'PENDING', joinDate: '2026-03-01' },
  ];

  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // 2. 폼 상태 관리
  const [policyData, setPolicyData] = useState<SettlementPolicy>({
    platformFeeRate: '',
    networkFee: '',
    exchangeSpread: '',
    preferenceRate: '',
  });

  // 가맹점 클릭 시 정책 불러오기 (임시값 세팅)
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    // 💡 실제로는 여기서 GET /api/admin/settlements/policy/{client.merchantId} 를 호출하여 데이터를 채워야 합니다.
    // 지금은 기본값을 보여주도록 설정합니다.
    setPolicyData({
      platformFeeRate: '0.015',   // 1.5%
      networkFee: '2000',         // 2000원
      exchangeSpread: '10.0',     // 달러당 10원 마진
      preferenceRate: '0.90',     // 90% 환율 우대
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPolicyData(prev => ({ ...prev, [name]: value }));
  };

  // 🌟 3. 관리자가 변경한 수수료를 백엔드로 전송
  const handleSavePolicy = async () => {
    if (!selectedClient) return;
    
    if (!window.confirm(`${selectedClient.name}의 수수료 정책을 업데이트 하시겠습니까?`)) return;

    try {
      //
      const response = await fetch(`http://localhost:8080/api/admin/settlements/policy/${selectedClient.merchantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        //
        body: JSON.stringify({
          platformFeeRate: parseFloat(policyData.platformFeeRate),
          networkFee: parseFloat(policyData.networkFee),
          exchangeSpread: parseFloat(policyData.exchangeSpread),
          preferenceRate: parseFloat(policyData.preferenceRate),
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === 'SUCCESS') {
        alert('✅ 가맹점 수수료 정책이 성공적으로 반영되었습니다!');
      } else {
        alert(`❌ 업데이트 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 통신 에러:', error);
      alert('서버와 통신 중 문제가 발생했습니다.');
    }
  };

  return (
    <CommonLayout>
      <main className="w-full px-4 py-8 mx-auto max-w-7xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">🏢 기업 고객 및 수수료 정책 관리</h2>
        
        <div className="flex flex-col gap-6 lg:flex-row">
          
          {/* 좌측: 가맹점 리스트 */}
          <div className="w-full lg:w-1/3 bg-white border border-gray-200 shadow-sm rounded-xl p-6 min-h-[500px]">
            <h3 className="mb-4 text-lg font-bold text-gray-800">가맹점 목록</h3>
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
                    <div className="text-sm font-medium">{client.name}</div>
                    <div className="mt-1 font-mono text-xs text-gray-500">{client.merchantId}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 우측: 수수료 정책 설정 폼 */}
          <div className="w-full p-6 bg-white border border-gray-200 shadow-sm lg:w-2/3 rounded-xl">
            {selectedClient ? (
              <div>
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800">
                    <span className="text-teal-600">{selectedClient.name}</span> 수수료 정책 설정
                  </h3>
                  <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                    {selectedClient.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* 플랫폼 수수료율 */}
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

                  {/* 네트워크 수수료 */}
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

                  {/* 환전 스프레드 */}
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

                  {/* 환율 우대율 */}
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
                <p>좌측에서 가맹점을 선택하면 수수료 정책을 관리할 수 있습니다.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </CommonLayout>
  );
}