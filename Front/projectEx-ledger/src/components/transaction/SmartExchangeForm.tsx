import React, { useState, useEffect } from "react";
import axios from "axios";
import { RefreshCw, Send } from "lucide-react";
import { toast } from 'sonner';

// 🌟 [타입 정의] A님이 주는 환율 데이터의 규격을 정의하여 'never' 에러를 방지합니다.
interface ExchangeRate {
  curUnit: string; // 통화 코드 (예: USD)
  curNm: string; // 통화명 (예: 미국 달러)
  rate: number; // 환율
}

// 부모 컴포넌트(MyPage)에서 새로고침을 제어할 수 있도록 Props 추가
interface SmartExchangeFormProps {
  onPaymentSuccess?: () => void;
}

const SmartExchangeForm = ({ onPaymentSuccess }: SmartExchangeFormProps) => {
  // 🌟 useState에 <ExchangeRate[]> 타입을 명시하여 빈 배열 초기화 시의 에러를 해결했습니다.
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. 실시간 환율 데이터 가져오기 (A님의 API 호출)
  const fetchRates = async () => {
    try {
      const response = await axios.get("/api/v1/exchange/latest");
      // 백엔드 ApiResponse.success() 규격인 { data: { data: [...] } } 구조에 맞춰 접근
      setRates(response.data.data);
    } catch (error) {
      console.error("환율 로딩 실패:", error);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // 2. 실시간 계산 로직 (C님의 정산 엔진과 동일한 공식)
  useEffect(() => {
    // 이제 r.curUnit을 정상적으로 인식합니다.
    const currentRate =
      rates.find((r) => r.curUnit === selectedCurrency)?.rate || 0;
    const result = parseFloat(amount || "0") * currentRate;
    setConvertedAmount(Math.round(result)); // 정수 단위 반올림
  }, [amount, selectedCurrency, rates]);

  // 3. 결제 요청 (C님의 Transaction API 호출)
  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.info("올바른 금액을 입력하세요.");

    setLoading(true);
    try {
      // 🌟 [추가] 테스트용 외부 거래 ID 생성 (실제로는 결제창에서 받아옵니다)
      const mockExternalId = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await axios.post("/api/v1/transactions", {
        amount: parseFloat(amount),
        currency: selectedCurrency,
        description: "해외 온라인 결제 테스트",
        // 🌟 [중요] 백엔드 DTO에 추가한 필드명을 정확히 맞춰서 보냅니다.
        externalTransactionId: mockExternalId,
      });

      toast.success("✅ 결제 및 정산이 완료되었습니다!");
      setAmount("");

      if (onPaymentSuccess) onPaymentSuccess();
    } catch (error) {
      console.error("결제 실패:", error);
      toast.error("결제 실패: 서버 상태를 확인하거나 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md p-6 mx-auto bg-white border border-gray-100 shadow-lg rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">해외 결제 & 송금</h2>
        <button
          onClick={fetchRates}
          className="p-2 transition rounded-full hover:bg-gray-100"
          title="환율 새로고침"
        >
          <RefreshCw size={18} className="text-blue-500" />
        </button>
      </div>

      {/* 통화 선택 */}
      <div className="mb-4">
        <label className="block mb-1 text-sm font-medium text-gray-500">
          통화 선택
        </label>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full p-3 transition-all border border-gray-200 outline-none bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500"
        >
          {rates.length > 0 ? (
            rates.map((r) => (
              <option key={r.curUnit} value={r.curUnit}>
                {r.curNm} ({r.curUnit})
              </option>
            ))
          ) : (
            <option>환율 정보를 불러오는 중...</option>
          )}
        </select>
      </div>

      {/* 금액 입력 */}
      <div className="mb-6">
        <label className="block mb-1 text-sm font-medium text-gray-500">
          외화 금액
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full p-4 text-2xl font-semibold transition-all border border-gray-200 outline-none bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute font-bold text-gray-400 right-4 top-4">
            {selectedCurrency}
          </span>
        </div>
      </div>

      {/* 정산 결과 표시 */}
      <div className="p-4 mb-6 border border-blue-100 bg-blue-50 rounded-xl">
        <div className="mb-1 text-sm font-medium text-blue-600">
          예상 정산 금액 (원화)
        </div>
        <div className="text-3xl font-bold text-blue-700">
          {convertedAmount.toLocaleString()}{" "}
          <span className="text-lg font-medium">KRW</span>
        </div>
        <div className="mt-2 text-xs text-blue-400">
          * 실시간 환율 엔진에 의해 계산되었습니다.
        </div>
      </div>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="flex items-center justify-center w-full gap-2 py-4 font-bold text-white transition bg-blue-600 hover:bg-blue-700 rounded-xl disabled:bg-gray-300 shadow-md active:scale-[0.98]"
      >
        {loading ? (
          "결제 처리 중..."
        ) : (
          <>
            <Send size={18} /> 결제 신청하기
          </>
        )}
      </button>
    </div>
  );
};

export default SmartExchangeForm;
