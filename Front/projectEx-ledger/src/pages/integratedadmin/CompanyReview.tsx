import React, { useEffect, useState } from "react";
import http from "../../config/http";
import { CheckCircle, XCircle, FileImage, ShieldAlert, FileText } from "lucide-react";
import { toast } from 'sonner';

interface PendingCompany {
    userId: number;
    email: string;
    name: string;
    businessNumber: string;
    licenseFileUuid: string;
    createdAt: string;
}

const CompanyReview: React.FC = () => {
    const [pendingList, setPendingList] = useState<PendingCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchPendingCompanies = async () => {
        try {
            const res = await http.get("/admin/companies/pending");
            const apiResponse = res.data;
            if (apiResponse.status === "SUCCESS") {
                setPendingList(apiResponse.data);
            }
        } catch (err) {
            console.error("Failed to fetch pending companies:", err);
            toast.error("대기열을 가져오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingCompanies();
    }, []);

    const handleApprove = async (userId: number) => {
        if (!window.confirm("이 기업 회원을 승인하시겠습니까?")) return;
        try {
            await http.post(`/admin/companies/${userId}/approve`, {});
            toast.success("성공적으로 승인되었습니다.");
            fetchPendingCompanies();
        } catch (err: any) {
            toast.error("승인 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
        }
    };

    const handleReject = async (userId: number) => {
        if (!window.confirm("정말로 이 기업 가입을 반려하시겠습니까? (복구 불가)")) return;
        try {
            await http.post(`/admin/companies/${userId}/reject`, {});
            toast.info("가입 요청이 반려되었습니다.");
            fetchPendingCompanies();
        } catch (err: any) {
            toast.error("반려 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
        }
    };

    const handleViewLicense = async (uuid: string) => {
        try {
            const response = await http.get(`/admin/companies/license/${uuid}`, {
                responseType: "blob"
            });
            const imageUrl = URL.createObjectURL(response.data);
            setSelectedImage(imageUrl);
        } catch (err) {
            console.error("Failed to load license image:", err);
            toast.error("이미지를 불러오는데 실패했습니다.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <ShieldAlert className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-black tracking-tight text-slate-800">
                    신규 기업(가맹점) 심사
                </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {pendingList.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-medium">
                        현재 대기 중인 기업 가입 심사가 없습니다.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 font-bold text-gray-600">가입 일자</th>
                                <th className="p-4 font-bold text-gray-600">담당자 이름</th>
                                <th className="p-4 font-bold text-gray-600">이메일 계정</th>
                                <th className="p-4 font-bold text-gray-600">사업자 등록번호</th>
                                <th className="p-4 font-bold text-center text-gray-600">사업자 등록증</th>
                                <th className="p-4 font-bold text-right text-gray-600">심사 액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingList.map((company) => (
                                <tr key={company.userId} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                    <td className="p-4 text-sm text-gray-500">
                                        {company.createdAt ? new Date(company.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td className="p-4 font-medium text-slate-700">{company.name}</td>
                                    <td className="p-4 text-gray-600">{company.email}</td>
                                    <td className="p-4 font-mono text-sm tracking-widest text-blue-600 bg-blue-50 rounded px-2">
                                        {company.businessNumber}
                                    </td>
                                    <td className="p-4 text-center">
                                        {company.licenseFileUuid ? (
                                            <button
                                                onClick={() => handleViewLicense(company.licenseFileUuid)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                                            >
                                                <FileImage className="w-4 h-4" />
                                                사본 열람
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400 flex items-center justify-center gap-1">
                                                <FileText className="w-4 h-4" /> 미제출
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleApprove(company.userId)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors shadow-sm"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                승인
                                            </button>
                                            <button
                                                onClick={() => handleReject(company.userId)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                반려
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 이미지 열람 모달 */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <FileImage className="w-5 h-5 text-indigo-500" />
                                사업자 등록증 보안 열람
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedImage(null);
                                    URL.revokeObjectURL(selectedImage);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center bg-slate-100/50 min-h-[50vh] max-h-[80vh] overflow-auto">
                            <img
                                src={selectedImage}
                                alt="License File"
                                className="max-w-full h-auto rounded-xl shadow-sm border border-slate-200"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyReview;
