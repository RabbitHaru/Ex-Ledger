import React, { useState, useEffect } from "react";
import http from "../../config/http";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";

interface GradePolicy {
  platformFeeRate: number;
  networkFee: number;
  exchangeSpread: number;
  preferenceRate: number;
}

const GradePolicyManagement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [partnerPolicy, setPartnerPolicy] = useState<GradePolicy>({
    platformFeeRate: 0.5,
    networkFee: 0,
    exchangeSpread: 2.0,
    preferenceRate: 100,
  });

  const [generalPolicy, setGeneralPolicy] = useState<GradePolicy>({
    platformFeeRate: 1.5,
    networkFee: 2000,
    exchangeSpread: 10.0,
    preferenceRate: 90,
  });

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const [partnerRes, generalRes] = await Promise.all([
        http.get<any>("/admin/settlements/policy/GRADE_PARTNER"),
        http.get<any>("/admin/settlements/policy/GRADE_GENERAL"),
      ]);

      if (partnerRes.data?.data) {
        const d = partnerRes.data.data;
        setPartnerPolicy({
          platformFeeRate: Number(d.platformFeeRate) * 100,
          networkFee: Number(d.networkFee),
          exchangeSpread: Number(d.exchangeSpread),
          preferenceRate: Number(d.preferenceRate) * 100,
        });
      }

      if (generalRes.data?.data) {
        const d = generalRes.data.data;
        setGeneralPolicy({
          platformFeeRate: Number(d.platformFeeRate) * 100,
          networkFee: Number(d.networkFee),
          exchangeSpread: Number(d.exchangeSpread),
          preferenceRate: Number(d.preferenceRate) * 100,
        });
      }
    } catch (error) {
      toast.error("등급 정책을 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSave = async (grade: 'PARTNER' | 'GENERAL') => {
    const label = grade === 'PARTNER' ? '파트너' : '일반';
    if (!window.confirm(`${label} 등급의 정책을 일괄 변경하시겠습니까?`)) return;

    setIsSaving(true);
    const policy = grade === 'PARTNER' ? partnerPolicy : generalPolicy;
    const payload = {
      platformFeeRate: policy.platformFeeRate / 100,
      networkFee: policy.networkFee,
      exchangeSpread: policy.exchangeSpread,
      preferenceRate: policy.preferenceRate / 100,
    };

    try {
      // 🌟 [핵심 수정] API 호출과 1.5초 타이머를 동시에 실행하여 최소 시간을 확보합니다.
      const [response] = await Promise.all([
        http.patch(`/admin/settlements/grades/policy?grade=${grade}`, payload),
        new Promise(resolve => setTimeout(resolve, 1500)) 
      ]);

      if (response.data?.status === 'SUCCESS') {
        toast.success(`${label} 등급 정책 업데이트 완료`);
        fetchPolicies();
      }
    } catch (error) {
      toast.error("정책 저장 오류");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    grade: "PARTNER" | "GENERAL",
    field: keyof GradePolicy,
    value: string,
  ) => {
    const sanitizedValue = value.replace(/^0+(?!\.|$)/, "");
    const numValue = sanitizedValue === "" ? 0 : Number(sanitizedValue);

    if (grade === "PARTNER") {
      setPartnerPolicy((prev) => ({ ...prev, [field]: numValue }));
    } else {
      setGeneralPolicy((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="animate-spin" />
      </div>
    );

  return (
    <>
      <main className="flex-grow w-full px-4 py-12 mx-auto max-w-[1100px]">
        <div className="mb-12">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">
            전역 등급 정책 관리
          </h2>
          <p className="mt-3 text-lg font-medium text-slate-500">
            가맹점 등급별 수수료 및 환전 마진 가이드라인을 일괄 제어합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="relative p-10 bg-white border border-indigo-100 shadow-2xl rounded-[48px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
            <div className="mb-10">
              <span className="inline-block px-4 py-1.5 mb-3 text-xs font-black tracking-widest text-slate-900 uppercase bg-indigo-50 rounded-2xl">
                Partner Grade
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                파트너 정책
              </h3>
            </div>

            <div className="space-y-6">
              <PolicyInput
                label="정산 서비스 이용료"
                value={partnerPolicy.platformFeeRate}
                unit="%"
                onChange={(v) => handleChange("PARTNER", "platformFeeRate", v)}
              />
              <PolicyInput
                label="해외 송금 전신료"
                value={partnerPolicy.networkFee}
                unit="KRW"
                onChange={(v) => handleChange("PARTNER", "networkFee", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <PolicyInput
                  label="환율 우대율"
                  value={partnerPolicy.preferenceRate}
                  unit="%"
                  onChange={(v) => handleChange("PARTNER", "preferenceRate", v)}
                />
                <PolicyInput
                  label="환전 스프레드"
                  value={partnerPolicy.exchangeSpread}
                  unit="pt"
                  onChange={(v) => handleChange("PARTNER", "exchangeSpread", v)}
                />
              </div>
            </div>

            <button
              onClick={() => handleSave("PARTNER")}
              disabled={isSaving}
              className="w-full py-6 mt-10 text-lg font-black text-white bg-indigo-600 rounded-[32px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              업데이트
            </button>
          </div>

          <div className="relative p-10 bg-white border border-slate-200 shadow-xl rounded-[48px] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-400" />
            <div className="mb-10">
              <span className="inline-block px-4 py-1.5 mb-3 text-xs font-black tracking-widest text-slate-400 uppercase bg-slate-50 rounded-2xl">
                General Grade
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                일반 가맹점 정책
              </h3>
            </div>

            <div className="space-y-6">
              <PolicyInput
                label="정산 서비스 이용료"
                value={generalPolicy.platformFeeRate}
                unit="%"
                onChange={(v) => handleChange("GENERAL", "platformFeeRate", v)}
              />
              <PolicyInput
                label="해외 송금 전신료"
                value={generalPolicy.networkFee}
                unit="KRW"
                onChange={(v) => handleChange("GENERAL", "networkFee", v)}
              />
              <div className="grid grid-cols-2 gap-4">
                <PolicyInput
                  label="환율 우대율"
                  value={generalPolicy.preferenceRate}
                  unit="%"
                  onChange={(v) => handleChange("GENERAL", "preferenceRate", v)}
                />
                <PolicyInput
                  label="환전 스프레드"
                  value={generalPolicy.exchangeSpread}
                  unit="pt"
                  onChange={(v) => handleChange("GENERAL", "exchangeSpread", v)}
                />
              </div>
            </div>

            <button
              onClick={() => handleSave("GENERAL")}
              disabled={isSaving}
              className="w-full py-6 mt-10 text-lg font-black text-white bg-slate-800 rounded-[32px] hover:bg-slate-900 transition-all shadow-xl shadow-slate-100"
            >
              업데이트
            </button>
          </div>
        </div>
      </main>

      {isSaving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
          <div className="flex flex-col items-center w-full max-w-md p-10 text-center bg-white shadow-2xl rounded-[32px] animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-50">
              <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
            <h3 className="mb-3 text-xl font-black tracking-tight text-slate-900">
              플랫폼 정책 업데이트 중...
            </h3>
            <p className="text-sm font-bold leading-relaxed text-slate-500">
              가맹점 전역 정책을 동기화하고 있습니다.
              <br />
              잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

interface InputProps {
  label: string;
  value: number;
  unit: string;
  onChange: (val: string) => void;
}

const PolicyInput: React.FC<InputProps> = ({
  label,
  value,
  unit,
  onChange,
}) => (
  <div className="p-6 transition-all border border-slate-50 bg-slate-50/50 rounded-3xl focus-within:bg-white focus-within:border-slate-200">
    <label className="block mb-3 text-xs font-black tracking-tighter uppercase text-slate-400">
      {label}
    </label>
    <div className="flex items-center justify-between">
      <input
        type="number"
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-3xl font-black bg-transparent text-slate-900 focus:outline-none"
      />
      <span className="ml-2 text-sm font-black text-slate-300">{unit}</span>
    </div>
  </div>
);

export default GradePolicyManagement;
