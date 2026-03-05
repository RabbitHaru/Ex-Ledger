import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ReconciliationDetail() {
  // URL에서 정산 ID를 가져옵니다 (예: /admin/settlement/123)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 오차 수정 폼 상태 관리
  const [correctedAmount, setCorrectedAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // 🚨 1. 오차 수정 (PATCH API 호출)
  const handleResolveDiscrepancy = async () => {
    if (!correctedAmount || !reason) {
      alert('수정 금액과 사유를 모두 입력해주세요.');
      return;
    }

    try {
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
        alert('✅ 오차 수정이 완료되었습니다.');
        setCorrectedAmount('');
        setReason('');
        // 필요하다면 여기서 상세 데이터를 다시 불러오는 함수 호출
      } else {
        alert(`❌ 수정 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 에러:', error);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  // ✅ 2. 수동 승인 (POST API 호출)
  const handleApprove = async () => {
    if (!window.confirm('이 정산 건을 승인하시겠습니까? 송금 대기 상태로 넘어갑니다.')) return;

    try {
      const response = await fetch(`http://localhost:8080/api/admin/settlements/${id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.status === 'SUCCESS') {
        alert('✅ 승인이 완료되었습니다!');
        navigate('/pages/admin/settlement'); // 리스트 페이지로 돌아가기
      } else {
        alert(`❌ 승인 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('API 에러:', error);
      alert('서버와 통신 중 에러가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📊 정산 대사 상세 및 수동 승인 (ID: {id})</h2>
      <hr />

      {/* 오차 수정 영역 */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '15px', marginTop: '20px', borderRadius: '8px' }}>
        <h3>🛠️ 오차 발생 건 수정</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>수정할 금액 (KRW): </label>
          <input 
            type="number" 
            value={correctedAmount} 
            onChange={(e) => setCorrectedAmount(e.target.value)} 
            placeholder="예: 15000"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>수정 사유: </label>
          <input 
            type="text" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)} 
            placeholder="예: 환율 변동으로 인한 수동 보정"
            style={{ width: '100%' }}
          />
        </div>
        <button onClick={handleResolveDiscrepancy} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          오차 수정 적용
        </button>
      </div>

      {/* 수동 승인 영역 */}
      <div style={{ marginTop: '30px', textAlign: 'right' }}>
        <p style={{ fontSize: '12px', color: 'gray' }}>* 모든 대사가 확인되었다면 승인해주세요.</p>
        <button 
          onClick={handleApprove} 
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ✅ 수동 승인 및 송금 대기
        </button>
      </div>
    </div>
  );
}