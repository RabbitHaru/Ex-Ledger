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
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'approve' | 'reject';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'approve'
    });

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

    const handleApprove = (userId: number) => {
        setConfirmModal({
            isOpen: true,
            title: "기업 회원 승인",
            message: "이 기업 회원의 가맹점 신청을 승인하시겠습니까? 승인 즉시 기업 서비스 이용이 가능해집니다.",
            type: 'approve',
            onConfirm: async () => {
                try {
                    await http.post(`/admin/companies/${userId}/approve`, {});
                    toast.success("성공적으로 승인되었습니다.");
                    fetchPendingCompanies();
                } catch (err: any) {
                    toast.error("승인 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleReject = (userId: number) => {
        setConfirmModal({
            isOpen: true,
            title: "기업 가입 반려",
            message: "정말로 이 기업의 가입 요청을 반려하시겠습니까? 반려 처리된 요청은 복구가 불가능합니다.",
            type: 'reject',
            onConfirm: async () => {
                try {
                    await http.post(`/admin/companies/${userId}/reject`, {});
                    toast.info("가입 요청이 반려되었습니다.");
                    fetchPendingCompanies();
                } catch (err: any) {
                    toast.error("반려 중 오류가 발생했습니다: " + (err.response?.data?.message || err.message));
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleViewLicense = async (uuid: string) => {
        try {
            const response = await http.get(`/admin/companies/license/${uuid}`, {
                responseType: "blob"
            });
            const blob = response.data;
            
            // 만약 서버에서 에러가 발생하여 JSON을 Blob으로 보낸 경우 처리
            if (blob.type === "application/json") {
                const text = await blob.text();
                const errorData = JSON.parse(text);
                toast.error(errorData.message || "이미지를 불러오는데 실패했습니다.");
                return;
            }

            const contentUrl = URL.createObjectURL(blob);
            
            // PDF 파일인 경우 새 창에서 열기
            if (blob.type === "application/pdf") {
                window.open(contentUrl, "_blank");
                toast.success("PDF 파일을 새 탭에서 열었습니다.");
            } else {
                // 이미지 파일인 경우 모달에서 열기
                setSelectedImage(contentUrl);
            }
        } catch (err: any) {
            console.error("Failed to load license file:", err);
            toast.error("파일을 불러오는 중 오류가 발생했습니다. (파일이 서버에 없거나 권한이 부족할 수 있습니다)");
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-white rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                    <FileImage className="w-6 h-6" />
                                </div>
                                사업자 등록증 보안 열람
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedImage(null);
                                    if (selectedImage) URL.revokeObjectURL(selectedImage);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <XCircle className="w-8 h-8" />
                            </button>
                        </div>
                        <div className="p-8 flex items-center justify-center bg-slate-50 min-h-[50vh] max-h-[75vh] overflow-auto">
                            <img
                                src={selectedImage}
                                alt="License File"
                                className="max-w-full h-auto rounded-3xl shadow-2xl border-4 border-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 프리미엄 컨펌 모달 */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner ${confirmModal.type === 'approve' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                {confirmModal.type === 'approve' ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                                    {confirmModal.title}
                                </h3>
                                <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                                    {confirmModal.message}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="py-4 px-6 rounded-3xl font-black text-slate-400 hover:bg-slate-50 transition-all border border-slate-100"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`py-4 px-6 rounded-3xl font-black text-white shadow-lg active:scale-95 transition-all ${confirmModal.type === 'approve' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
                                >
                                    {confirmModal.type === 'approve' ? '승인하기' : '반려하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyReview;
