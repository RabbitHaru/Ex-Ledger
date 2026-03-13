import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, Search, Trash2, Mail, Building2, Calendar } from 'lucide-react';
import http from '../../config/http';
import { toast } from 'sonner';

interface Member {
    id: number;
    email: string;
    name: string;
    role: string;
    isApproved: boolean;
    companyName?: string;
    businessNumber?: string;
    createdAt: string;
    mfaEnabled: boolean;
}

const MemberManagement: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const res: any = await http.get('/admin/members');
            if (res.data?.status === 'SUCCESS') {
                setMembers(res.data.data || []);
            }
        } catch (error) {
            console.error("멤버 로드 실패:", error);
            toast.error("전체 멤버 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleUpdateRole = async (userId: number, newRole: string) => {
        try {
            const res: any = await http.post(`/admin/members/${userId}/role`, { role: newRole });
            if (res.data?.status === 'SUCCESS') {
                toast.success("권한이 성공적으로 변경되었습니다.");
                fetchMembers();
            }
        } catch (error) {
            toast.error("권한 변경 중 오류가 발생했습니다.");
        }
    };

    const handleUpdateApproval = async (userId: number, isApproved: boolean) => {
        try {
            const res: any = await http.post(`/admin/members/${userId}/approval`, { isApproved });
            if (res.data?.status === 'SUCCESS') {
                toast.success(isApproved ? "사용자가 승인되었습니다." : "사용자 승인이 취소되었습니다.");
                fetchMembers();
            }
        } catch (error) {
            toast.error("상태 업데이트 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (userId: number, name: string) => {
        if (!window.confirm(`${name} 님의 계정을 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        try {
            const res: any = await http.delete(`/admin/members/${userId}`);
            if (res.data?.status === 'SUCCESS') {
                toast.warning("계정이 삭제되었습니다.");
                fetchMembers();
            }
        } catch (error) {
            toast.error("삭제 처리 중 오류가 발생했습니다.");
        }
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (m.companyName && m.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <main className="max-w-[1400px] mx-auto p-8 space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-900 text-white rounded-[24px] shadow-2xl shadow-slate-200">
                            <Users size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900">전체 사용자 관리</h1>
                            <p className="text-slate-400 font-bold text-sm mt-1">플랫폼 내 모든 회원 정보 및 권한 체계 통합 관리</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                    <div className="relative group flex-1 sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="이름, 이메일, 기업명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[14px] font-bold outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>
                    
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[14px] font-black text-slate-700 outline-none focus:border-slate-900 transition-all shadow-sm cursor-pointer"
                    >
                        <option value="ALL">모든 권한 보기</option>
                        <option value="ROLE_USER">개인 회원</option>
                        <option value="ROLE_COMPANY_USER">기업 실무자</option>
                        <option value="ROLE_COMPANY_ADMIN">기업 관리자</option>
                        <option value="ROLE_INTEGRATED_ADMIN">최고 관리자</option>
                    </select>
                </div>
            </header>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden border-b-4 border-b-slate-900/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">기본 정보</th>
                                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">소속 및 상태</th>
                                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">권한 설정</th>
                                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-24 text-center text-slate-400 font-bold italic">데이터베이스 동기화 중...</td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan={4} className="py-24 text-center text-slate-400 font-bold italic">검색 결과가 없습니다.</td></tr>
                            ) : filteredMembers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-7">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                                                user.role === 'ROLE_INTEGRATED_ADMIN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-[15px]">{user.name}</p>
                                                <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold mt-0.5">
                                                    <Mail size={12} />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-7">
                                        <div className="space-y-2">
                                            {user.companyName ? (
                                                <div className="flex items-center gap-1.5 text-[13px] font-black text-indigo-600">
                                                    <Building2 size={14} />
                                                    {user.companyName}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-300 italic">소속 없음 (개인)</span>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => handleUpdateApproval(user.id, !user.isApproved)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight transition-all ${
                                                        user.isApproved ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}
                                                >
                                                    {user.isApproved ? <UserCheck size={12} /> : <UserX size={12} />}
                                                    {user.isApproved ? '승인됨' : '미승인'}
                                                </button>
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                                    <Calendar size={12} />
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-7">
                                        <select 
                                            value={user.role}
                                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[12px] font-black text-slate-600 outline-none focus:border-slate-900 transition-all cursor-pointer"
                                        >
                                            <option value="ROLE_USER">개인 회원</option>
                                            <option value="ROLE_COMPANY_USER">기업 실무자</option>
                                            <option value="ROLE_COMPANY_ADMIN">기업 관리자</option>
                                            <option value="ROLE_INTEGRATED_ADMIN">최고 관리자</option>
                                        </select>
                                    </td>
                                    <td className="px-8 py-7 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleDelete(user.id, user.name)}
                                                className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                title="영구 삭제"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

export default MemberManagement;
