import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatCurrency } from "../../../utils/formatter";

const RemittanceRequest = () => {
  const [request, setRequest] = useState({
    recipientName: "",
    recipientBank: "",
    recipientAccount: "",
    currency: "USD",
    amount: 0,
    clientGrade: "NORMAL",
  });

  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (request.amount > 0) {
        calculateFee();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [request.amount, request.currency]);

  const calculateFee = async () => {
    try {
      const response = await axios.post("/api/v1/remittance/fee/calculate", {
        amount: request.amount,
        currency: request.currency,
        exchangeRate: 1450,
        clientGrade: request.clientGrade,
      });
      setFeeBreakdown(response.data);
    } catch (error) {
      console.error("수수료 계산 실패", error);
    }
  };

  return (
    <div className="max-w-xl p-8 mx-auto bg-white border border-gray-100 shadow-xl rounded-3xl">
      <h2 className="mb-6 text-2xl font-black text-gray-800">해외 송금 신청</h2>

      <div className="space-y-4">
        <input
          placeholder="수취인 실명"
          className="w-full p-4 outline-none bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500"
          onChange={(e) =>
            setRequest({ ...request, recipientName: e.target.value })
          }
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="송금 외화 금액"
            className="flex-1 p-4 font-bold bg-gray-50 rounded-xl"
            onChange={(e) =>
              setRequest({ ...request, amount: Number(e.target.value) })
            }
          />
          <span className="p-4 font-bold bg-gray-100 rounded-xl">
            {request.currency}
          </span>
        </div>

        {feeBreakdown && (
          <div className="p-5 space-y-2 text-sm bg-blue-50 rounded-2xl">
            <div className="flex justify-between text-gray-500">
              <span>원화 환산액</span>
              <span>{formatCurrency(feeBreakdown.baseKrwAmount, "KRW")}</span>
            </div>
            <div className="flex justify-between font-medium text-red-500">
              <span>총 수수료 (전신료 포함)</span>
              <span>
                + {formatCurrency(feeBreakdown.totalFeeAmount, "KRW")}
              </span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-black text-blue-700 border-t border-blue-200">
              <span>최종 결제 금액</span>
              <span>{formatCurrency(feeBreakdown.totalPayment, "KRW")}</span>
            </div>
          </div>
        )}

        <button className="w-full py-4 font-bold text-white transition-all bg-blue-600 shadow-lg rounded-xl hover:bg-blue-700 shadow-blue-100">
          송금 신청 확정
        </button>
      </div>
    </div>
  );
};

export default RemittanceRequest;
