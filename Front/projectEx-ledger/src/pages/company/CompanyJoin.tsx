import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CommonLayout from "../../components/layout/CommonLayout";
import http from '../../config/http';
import { toast } from 'sonner';

const CompanyJoin: React.FC = () => {
    const [businessNumber, setBusinessNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessNumber) {
            toast.info("사업자등록번호를 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res: any = await http.post('/company/join', { businessNumber });

            if (res && res.status === 'SUCCESS') {
                toast.success("성공적으로 소속 기업의 관리자에게 가입 승인을 요청했습니다.");
                navigate('/dashboard');
            } else {
                toast.error(`승인 요청 실패: ${res?.message || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(`요청 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-md p-8 mx-auto mt-20 bg-white border border-gray-200 shadow-sm rounded-xl">
            <h2 className="mb-6 text-2xl font-bold text-gray-800">🏢 소속 기업 인증하기</h2>
            <p className="mb-6 text-sm text-gray-600">
                정산 및 주요 자금 관련 서비스에 접근하려면 소속 기업(법인)의 관리자로부터 승인을 받아야 합니다.
                사내 관리자에게 안내받은 사업자등록번호를 입력해주세요.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">사업자등록번호 (하이픈 제외 숫자만)</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="예: 1234567890"
                        value={businessNumber}
                        onChange={(e) => setBusinessNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 font-bold text-white bg-[#007b70] rounded-md hover:bg-teal-700 disabled:opacity-50 transition"
                >
                    {isSubmitting ? '요청 중...' : '승인 요청 발송'}
                </button>
            </form>
        </div>
    );
};

export default CompanyJoin;
