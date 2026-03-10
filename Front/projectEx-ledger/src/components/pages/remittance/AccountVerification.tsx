import React, { useState } from "react";
import axios from "axios";
import { Search, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from 'sonner';

// 🌟 1. Props 인터페이스 정의 (에러 해결 핵심)
interface AccountVerificationProps {
  onVerificationSuccess: (ownerName: string) => void;
}

const AccountVerification: React.FC<AccountVerificationProps> = ({
  onVerificationSuccess,
}) => {
  const [bankCode, setBankCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyAccount = async () => {
    if (!bankCode || !accountNo) {
      toast.info("은행과 계좌번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 🌟 2. PortOneClient를 사용하는 백엔드 API 호출
      const response = await axios.get(`/api/v1/external/portone/verify`, {
        params: { bankCode, accountNo },
      });

      // 백엔드에서 String(holderName)을 바로 내려준다고 가정
      if (response.data) {
        setOwnerName(response.data);
        setIsVerified(true);

        // 🌟 3. 부모 컴포넌트에 성공 알림 및 데이터 전달
        onVerificationSuccess(response.data);
      }
    } catch (error) {
      console.error("계좌 인증 실패:", error);
      toast.error("계좌 정보를 확인할 수 없습니다. 정보를 다시 확인해주세요.");
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm">
      <h4 className="mb-4 text-sm font-bold text-gray-400">
        정산 계좌 실명 인증
      </h4>

      <div className="flex gap-2 mb-4">
        <select
          className="flex-1 p-3 text-sm transition-all outline-none bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500"
          onChange={(e) => setBankCode(e.target.value)}
        >
          <option value="">은행 선택</option>
          <option value="Kookmin">KB국민은행</option>{" "}
          {/* 포트원 V2 규격 코드 */}
          <option value="Shinhan">신한은행</option>
          <option value="Woori">우리은행</option>
        </select>
        <input
          className="flex-[2] p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="계좌번호 입력 ('-' 제외)"
          onChange={(e) => setAccountNo(e.target.value)}
        />
        <button
          onClick={verifyAccount}
          disabled={loading}
          className="px-6 text-sm font-bold text-white transition-all bg-gray-900 rounded-xl hover:bg-black disabled:bg-gray-300"
        >
          {loading ? "조회 중..." : "실명 조회"}
        </button>
      </div>

      {isVerified && (
        <div className="flex items-center gap-2 p-4 text-green-700 bg-green-50 rounded-2xl animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">
            인증 완료: 예금주 {ownerName}님
          </span>
        </div>
      )}
    </div>
  );
};

export default AccountVerification;
