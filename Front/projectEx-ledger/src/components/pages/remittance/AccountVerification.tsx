import React, { useState } from "react";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AccountVerificationProps {
  onVerificationSuccess: (ownerName: string) => void;
}

const AccountVerification: React.FC<AccountVerificationProps> = ({
  onVerificationSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePortOneCertification = () => {
    const { IMP }: any = window; // index.html에 포트원 스크립트가 로드되어 있어야 합니다.

    if (!IMP) {
      // 시연용 시뮬레이션: SDK가 없을 경우 가상으로 성공 처리
      setLoading(true);
      setTimeout(() => {
        onVerificationSuccess("김철수");
        setLoading(false);
      }, 1500);
      return;
    }

    setLoading(true);
    IMP.init("impXXXXXXXX"); // 포트원 가맹점 식별코드

    // KG이니시스 통합인증 호출
    IMP.certification(
      {
        merchant_uid: `cert_${new Date().getTime()}`,
        m_redirect_url: "", // 모바일 환경일 경우 필요
        popup: true,
      },
      (rsp: any) => {
        if (rsp.success) {
          // 인증 성공 시 포트원에서 제공하는 imp_uid를 가지고 서버에서 유저 정보를 가져와야 함
          // 여기서는 시연을 위해 즉시 성공으로 처리합니다.
          onVerificationSuccess("인증 완료 사용자");
        } else {
          toast.error(`인증에 실패했습니다: ${rsp.error_msg}`);
          setLoading(false);
        }
      },
    );
  };

  return (
    <div className="p-10 bg-white border border-slate-100 rounded-[40px] shadow-2xl space-y-8 text-center animate-in zoom-in duration-500">
      <div className="flex items-center justify-center w-20 h-20 mx-auto text-blue-600 shadow-lg bg-blue-50 rounded-3xl shadow-blue-100/50">
        <ShieldCheck size={40} />
      </div>

      <div className="space-y-2">
        <h4 className="text-xl font-black tracking-tighter text-slate-900">
          금융 보안 본인인증
        </h4>
        <p className="text-sm font-medium leading-relaxed text-slate-400">
          Ex-Ledger 가상계좌 발급을 위해 <br />
          포트원 통합인증(KG이니시스)이 필요합니다.
        </p>
      </div>

      <button
        onClick={handlePortOneCertification}
        disabled={loading}
        className="flex items-center justify-center w-full gap-3 py-5 text-lg font-black text-white transition-all bg-slate-900 rounded-2xl hover:bg-black active:scale-95 disabled:bg-slate-200"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <>
            인증하고 계좌 발급하기 <ArrowRight size={20} />
          </>
        )}
      </button>

      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        Securely Managed by PortOne & KG Inicis
      </p>
    </div>
  );
};

export default AccountVerification;
