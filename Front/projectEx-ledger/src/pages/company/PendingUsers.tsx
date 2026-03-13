import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, ShieldCheck, AlertCircle, Search } from 'lucide-react';
import http from '../../config/http';
import { toast } from 'sonner';

interface Member {
    id: number;
    email: string;
    name: string;
    role: string;
    isApproved: boolean;
}

const CompanyMemberManagement: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<Member[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [pendingRes, approvedRes]: any[] = await Promise.all([
                http.get('/company/users/pending'),
                http.get('/company/users/approved')
            ]);
            
            if (pendingRes.data?.status === 'SUCCESS') setPendingUsers(pendingRes.data.data || []);
            if (approvedRes.data?.status === 'SUCCESS') setApprovedUsers(approvedRes.data.data || []);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            toast.error("멤버 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (userId: number, userName: string) => {
        if (!window.confirm(`${userName} 님의 소속 승인을 진행하시겠습니까?`)) return;

        try {
            const res: any = await http.post(`/company/users/${userId}/approve`);
            if (res.data?.status === 'SUCCESS') {
                toast.success(`${userName} 님이 승인되었습니다.`);
                fetchData();
            }
        } catch (error) {
            toast.error("승인 처리 중 오류가 발생했습니다.");
        }
    };

    const handleRevoke = async (userId: number, userName: string) => {
        if (!window.confirm(`${userName} 님의 기업 소속 권한을 박탈하시겠습니까? 승인 대기 상태로 변경됩니다.`)) return;

        try {
            const res: any = await http.post(`/company/users/${userId}/revoke`);
            if (res.data?.status === 'SUCCESS') {
                toast.warning(`${userName} 님의 권한이 박탈되었습니다.`);
                fetchData();
            }
        } catch (error) {
            toast.error("권한 박탈 처리 중 오류가 발생했습니다.");
        }
    };

    const filteredApproved = approvedUsers.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main className="max-w-6xl mx-auto p-8 space-y-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                            <Users size={28} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">기업 멤버 관리</h1>
                    </div>
                    <p className="text-slate-400 font-bold text-sm ml-1">소속 직원 승인 및 권한 관리 시스템</p>
                </div>

                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="이름 또는 이메일 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all shadow-sm"
                    />
                </div>
            </header>

            {/* 승인 대기 섹션 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <UserPlus className="text-amber-500" size={20} />
                    <h2 className="text-xl font-black text-slate-800">승인 대기 중 ({pendingUsers.length})</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingUsers.length === 0 ? (
                        <div className="col-span-full py-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 font-bold italic">
                            현재 대기 중인 요청이 없습니다.
                        </div>
                    ) : pendingUsers.map(user => (
                        <div key={user.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-black text-slate-900 truncate">{user.name}</h3>
                                    <p className="text-[12px] font-bold text-slate-400 truncate">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleApprove(user.id, user.name)}
                                className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black text-[13px] hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-200"
                            >
                                소속 승인하기
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* 현역 멤버 섹션 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <ShieldCheck className="text-teal-500" size={20} />
                    <h2 className="text-xl font-black text-slate-800">활동 중인 멤버 ({filteredApproved.length})</h2>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[12px] font-black text-slate-400 uppercase tracking-widest">멤버 정보</th>
                                <th className="px-8 py-5 text-[12px] font-black text-slate-400 uppercase tracking-widest">권한 레벨</th>
                                <th className="px-8 py-5 text-[12px] font-black text-slate-400 uppercase tracking-widest text-right">관리 액션</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold italic border-none">데이터를 동기화 중입니다...</td></tr>
                            ) : filteredApproved.length === 0 ? (
                                <tr><td colSpan={3} className="py-20 text-center text-slate-400 font-bold italic border-none">멤버가 없습니다.</td></tr>
                            ) : filteredApproved.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800">{user.name}</p>
                                                <p className="text-[12px] font-medium text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            user.role === 'ROLE_COMPANY_ADMIN' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'
                                        }`}>
                                            {user.role.replace('ROLE_', '').replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {user.role === 'ROLE_COMPANY_USER' && (
                                            <button
                                                onClick={() => handleRevoke(user.id, user.name)}
                                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group-hover:opacity-100 md:opacity-0"
                                                title="권한 박탈"
                                            >
                                                <UserMinus size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
};

export default CompanyMemberManagement;
