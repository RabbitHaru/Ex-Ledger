import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

interface Props {
  onSuccess?: () => void;
}

const IdentityVerificationCard: React.FC<Props> = ({ onSuccess }) => {
  const { activatePersonalWallet } = useWallet();

  const handleVerification = () => {
    // PortOne 본인인증 연동 로직
    const { IMP } = window as any;
    IMP.init('가맹점_식별코드'); // 실제 코드로 변경 필요

    IMP.certification({
      merchant_uid: `cert_${new Date().getTime()}`,
      m_redirect_url: '/', // 모바일 환경 리다이렉트
      popup: true
    }, async (rsp: any) => {
      if (rsp.success) {
        // 성공 시 백엔드 동기화 및 상태 업데이트
        await activatePersonalWallet(rsp.imp_uid);
        if (onSuccess) onSuccess();
        alert('본인인증 및 지갑 활성화가 완료되었습니다!');
      } else {
        alert(`인증 실패: ${rsp.error_msg}`);
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-8">
        <ShieldCheck className="w-10 h-10 text-emerald-500" />
      </div>
      
      <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 mb-4">
        IDENTITY VERIFICATION
      </h2>
      
      <p className="text-gray-500 text-center mb-10 leading-relaxed">
        KG이니시스 본인인증을 통해<br />
        개인 전용 지갑을 활성화해 주세요.
      </p>

      <button
        onClick={handleVerification}
        className="w-full max-w-xs py-4 bg-[#0f172a] text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
      >
        본인인증 후 지갑 활성화
      </button>
    </div>
  );
};

export default IdentityVerificationCard;