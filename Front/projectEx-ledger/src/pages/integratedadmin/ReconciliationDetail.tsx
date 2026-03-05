import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CommonLayout from "../../components/layout/CommonLayout"; 

export default function ReconciliationDetail() {
  // URL에서 정산 ID를 가져옵니다 (예: /admin/settlement/123)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 오차 수정 폼 상태 관리
  const [correctedAmount, setCorrectedAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // 🚨 1. 오차 수정 및 동의 요청 (PATCH API 호출)
  const handleRequestConsent = async () => {
    if (!correctedAmount || !reason) {
      alert('수정 금액과 사유를 모두 입력해주세요.');
      return;
    }

    // 변경점: 즉시 수정이 아닌 동의 요청 확인
    if (!window.confirm('입력한 금액으로 유저에게 오차 수정 동의를 요청하시겠습니까?')) return;

    try {
      // 엔드포인트를 유저 동의 요청용으로 변경 (예: /resolve -> /request-consent)
const response = await fetch(`http://localhost:8080/api/admin/settlements/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedAmount: correctedAmount,
          reason: reason,
        }),
      });

      const result = await response.json();

      if (result.status === 'SUCCESS') {
        alert('✅ 유저에게 오차 수정 동의 요청이 발송되었습니다. (유저 동의 대기 상태)');
        setCorrectedAmount('');
        setReason('');
        navigate('/pages/admin/settlement'); // 요청 후 리스트 페이지로 이동
      } else {
        alert(`❌ 요청 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 에러:', error);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  // ✅ 2. 수동 승인 및 동의 요청 (POST API 호출)
  const handleApprove = async () => {
    // 변경점: 즉시 송금 대기가 아닌 유저 동의 후 송금 대기로 넘어간다는 안내
    if (!window.confirm('이 정산 건을 승인하시겠습니까?\n유저의 최종 동의 완료 후 송금 대기 상태로 넘어갑니다.')) return;

    try {
      // 엔드포인트를 승인 및 동의 요청용으로 변경
    const response = await fetch(`http://localhost:8080/api/admin/settlements/${id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.status === 'SUCCESS') {
        alert('✅ 유저에게 최종 승인 동의를 요청했습니다!');
        navigate('/pages/admin/settlement'); 
      } else {
        alert(`❌ 승인 요청 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 에러:', error);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  return (
    <CommonLayout>
      {/* 🌟 수정된 부분: max-w-3xl을 max-w-4xl로 변경하여 박스 전체 너비를 넓힘 */}
      <main className="w-full max-w-4xl px-4 py-12 mx-auto">
        <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
          <h2 className="text-2xl font-bold text-gray-900">📊 정산 대사 상세 및 승인 (ID: {id})</h2>
          
          {/* 🌟 추가 수정: break-keep을 넣어 화면이 줄어들더라도 단어 단위로 예쁘게 줄바꿈되도록 방어 */}
          <div className="p-4 mt-4 text-sm text-blue-700 rounded-lg bg-blue-50 break-keep">
             💡 관리자가 오차를 수정하거나 승인하면, <strong>유저(기업 고객)가 최종 동의해야만</strong> '송금 대기' 상태로 변경됩니다.
          </div>

          <hr className="my-6 border-gray-100" />

          {/* 오차 수정 영역 (기존 디자인 유지) */}
          <div className="p-6 mb-8 border border-red-100 bg-red-50/30 rounded-xl">
            <h3 className="mb-4 text-lg font-bold text-red-800">🛠️ 오차 발생 건 수정 및 동의 요청</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">수정할 금액 (KRW): </label>
                <input 
                  type="number" 
                  value={correctedAmount} 
                  onChange={(e) => setCorrectedAmount(e.target.value)} 
                  placeholder="예: 15000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">수정 사유 (유저에게 노출됨): </label>
                <input 
                  type="text" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="예: 환율 변동으로 인한 수동 보정"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <button 
                onClick={handleRequestConsent} 
                className="px-6 py-2.5 font-bold text-white transition bg-red-600 rounded-md hover:bg-red-700"
              >
                오차 수정 적용 및 유저 동의 요청 발송
              </button>
            </div>
          </div>

          {/* 수동 승인 영역 (기존 디자인 유지) */}
          <div className="pt-6 text-right border-t border-gray-100">
            <p className="mb-4 text-xs text-gray-500">* 모든 대사가 확인되었다면 승인하여 유저에게 최종 동의를 요청하세요.</p>
            <button 
              onClick={handleApprove} 
              className="px-6 py-3 text-sm font-bold text-white transition bg-[#007bff] rounded-md hover:bg-blue-700 shadow-sm"
            >
              ✅ 수동 승인 (유저 동의 요청 발송)
            </button>
          </div>
        </div>
      </main>
    </CommonLayout>
  );
}