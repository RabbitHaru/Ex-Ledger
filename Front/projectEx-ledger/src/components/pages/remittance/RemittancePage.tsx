import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from 'sonner';
import { OtpInput } from "../common/OtpInput";
import { Button } from "../common/Button";
import http from "../../../config/http";

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
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (formData.amount > 0) {
      const fetchFee = async () => {
        try {
          const response = await http.post("/remittance/fee/calculate", {
            amount: formData.amount,
            currency: formData.currency,
            exchangeRate: currentRate,
            clientGrade: "NORMAL",
          });
          setFeeDetail(response.data.data);
        } catch (error) {
          console.error("Fee calculation failed", error);
        }
      };
      fetchFee();
    }
  }, [formData.amount, formData.currency]);

  const handleSubmit = async (code?: string) => {
    setLoading(true);
    try {
      const headers: any = {};
      if (code) {
        headers['X-MFA-Code'] = code;
      }

      const response = await http.post("/remittance/request", {
        ...formData,
        exchangeRate: currentRate,
        feeAmount: feeDetail.totalFeeAmount,
        totalPayment: feeDetail.totalPayment,
      }, { headers });

      toast.success(`송금 신청 완료! 거래번호: ${response.data.data.transactionId}`);
      setShowOtp(false);
      setOtpCode("");
    } catch (error: any) {
      const message = error.response?.data?.message || "";
      if (message.includes("MFA_REQUIRED") || message.includes("HIGH_VALUE_MFA_REQUIRED")) {
        setShowOtp(true);
        if (message.includes("HIGH_VALUE_MFA_REQUIRED")) {
          toast.info("고액 처리로 인해 OTP 인증이 필요합니다.");
        }
      } else {
        toast.error(message || "송금 신청 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
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

        <Button
          onClick={() => handleSubmit()}
          disabled={loading}
          className="w-full py-5 text-lg font-bold text-white transition-all bg-blue-600 shadow-lg rounded-2xl hover:bg-blue-700 shadow-blue-200"
        >
          {loading ? "처리 중..." : "송금 신청하기"}
        </Button>
      </div>

      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm p-8 bg-white shadow-2xl rounded-[40px] border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="mb-8 text-center">
              <h3 className="text-xl font-black text-slate-800">보안 인증</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                안전한 거래를 위해 구글 OTP 번호를 입력해주세요.
              </p>
            </div>
            
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(code) => handleSubmit(code)}
              disabled={loading}
            />

            <Button
              onClick={() => setShowOtp(false)}
              variant="ghost"
              className="w-full mt-6 text-slate-400 font-bold hover:text-slate-600"
            >
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
