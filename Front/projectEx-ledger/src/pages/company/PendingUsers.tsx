import React, { useState, useEffect } from 'react';
import CommonLayout from "../../components/layout/CommonLayout";
import http from '../../config/http';
import { toast } from 'sonner';

interface PendingUser {
    id: number;
    email: string;
    name: string;
    businessNumber: string;
}

const PendingUsers: React.FC = () => {
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res: any = await http.get('/company/users/pending');
            if (res && res.status === 'SUCCESS') {
                setUsers(res.data || []);
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (userId: number, userName: string) => {
        if (!window.confirm(`${userName} 님의 소속(가입)을 승인하시겠습니까?`)) return;

        try {
            const res: any = await http.post(`/company/users/${userId}/approve`);
            if (res && res.status === 'SUCCESS') {
                toast.success("✅ 성공적으로 승인되었습니다.");
                fetchUsers();
            } else if (res) {
                toast.error(`❌ 승인 실패: ${res.message || '알 수 없는 오류'}`);
            }
        } catch (error) {
            toast.error("서버 통신 중 오류가 발생했습니다.");
        }
    };

    return (
        <main className="w-full max-w-5xl px-4 py-12 mx-auto">
            <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">👥 사내 멤버 소속 승인 대기열</h2>
                <p className="text-sm text-gray-500 mb-8">
                    당사의 사업자번호로 소속 인증을 요청한 일반 유저(직원) 목록입니다. 확인 후 승인해 주세요.
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                                <th className="px-4 py-4">사용자 이름</th>
                                <th className="px-4 py-4">가입 이메일(ID)</th>
                                <th className="px-4 py-4">사업자번호(요청)</th>
                                <th className="px-4 py-4 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-12 font-medium text-center text-gray-400">데이터를 불러오는 중입니다...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 font-medium text-center text-gray-400">현재 승인 대기 중인 사용자가 없습니다. 🎉</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="transition border-b border-gray-100 hover:bg-gray-50/50">
                                    <td className="px-4 py-4 font-bold text-gray-800">{user.name}</td>
                                    <td className="px-4 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-4 py-4 font-mono text-gray-500">{user.businessNumber}</td>
                                    <td className="px-4 py-4 text-center">
                                        <button
                                            onClick={() => handleApprove(user.id, user.name)}
                                            className="px-4 py-1.5 text-xs font-bold text-white transition bg-indigo-600 rounded shadow-sm hover:bg-indigo-700"
                                        >
                                            ✅ 승인하기
                                        </button>
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

export default PendingUsers;
