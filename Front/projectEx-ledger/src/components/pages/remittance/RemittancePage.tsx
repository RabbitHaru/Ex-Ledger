import React, { useState, useEffect } from "react";
import axios from "axios";

const RemittancePage = () => {
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientBank: "",
    recipientAccount: "",
    currency: "USD",
    amount: 0,
  });

  const [feeDetail, setFeeDetail] = useState<any>(null);
  const [currentRate, setCurrentRate] = useState(1450);
  useEffect(() => {
    if (formData.amount > 0) {
      const fetchFee = async () => {
        const response = await axios.post("/api/v1/remittance/fee/calculate", {
          amount: formData.amount,
          currency: formData.currency,
          exchangeRate: currentRate,
          clientGrade: "NORMAL",
        });
        setFeeDetail(response.data);
      };
      fetchFee();
    }
  }, [formData.amount, formData.currency]);

  const handleSubmit = async () => {
    try {
      const response = await axios.post("/api/v1/remittance/request", {
        ...formData,
        exchangeRate: currentRate,
        feeAmount: feeDetail.totalFeeAmount,
        totalPayment: feeDetail.totalPayment,
      });
      alert(`송금 신청 완료! 거래번호: ${response.data.transactionId}`);
    } catch (error) {
      alert("송금 신청 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-2xl p-8 mx-auto bg-white border border-gray-100 shadow-2xl rounded-3xl">
      <h2 className="mb-8 text-2xl font-black text-gray-800">해외 송금 신청</h2>

      <div className="space-y-6">
        <div>
          <label className="block mb-2 text-sm font-bold text-gray-500">
            송금 금액 ({formData.currency})
          </label>
          <input
            type="number"
            onChange={(e) =>
              setFormData({ ...formData, amount: Number(e.target.value) })
            }
            className="w-full p-4 font-mono text-xl border-none outline-none bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        {feeDetail && (
          <div className="p-6 space-y-3 border border-blue-100 bg-blue-50 rounded-2xl">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">원화 환산 금액</span>
              <span className="font-bold">
                {feeDetail.baseKrwAmount.toLocaleString()} KRW
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">총 수수료 (전신료 포함)</span>
              <span className="font-bold text-red-500">
                +{feeDetail.totalFeeAmount.toLocaleString()} KRW
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-blue-200">
              <span className="font-bold text-blue-900">최종 결제 금액</span>
              <span className="text-2xl font-black text-blue-700">
                {feeDetail.totalPayment.toLocaleString()} KRW
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-5 text-lg font-bold text-white transition-all bg-blue-600 shadow-lg rounded-2xl hover:bg-blue-700 shadow-blue-200"
        >
          송금 신청하기
        </button>
      </div>
    </div>
  );
};
