import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

interface Props {
  onSuccess?: () => void;
}

const IdentityVerificationCard: React.FC<Props> = ({ onSuccess }) => {
  const { activatePersonalWallet, isIdentityVerified, fetchWalletData } = useWallet();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleVerification = async () => {
    if (isIdentityVerified) {
      setIsProcessing(true);
      try {
        await activatePersonalWallet("ALREADY_VERIFIED");
        await fetchWalletData();
        alert('본인인증 정보가 확인되어 지갑이 즉시 활성화되었습니다!');
      } catch (e) {
        alert('지갑 활성화 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const { IMP } = window as any;
    if (!IMP) {
      alert('인증 모듈을 불러올 수 없습니다.');
      return;
    }
    IMP.init(import.meta.env.VITE_PORTONE_STORE_ID);

    IMP.certification({
      merchant_uid: `cert_${new Date().getTime()}`,
      m_redirect_url: '/',
      popup: true
    }, async (rsp: any) => {
      if (rsp.success) {
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
        disabled={isProcessing}
        className="w-full max-w-xs py-4 bg-[#0f172a] text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isIdentityVerified ? (
          "본인확인 완료 👉 지갑 활성화"
        ) : (
          "본인인증 후 지갑 활성화"
        )}
      </button>
    </div>
  );
};

export default IdentityVerificationCard;