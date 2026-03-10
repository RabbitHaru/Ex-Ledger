import React, { useState, useEffect } from 'react';
import CommonLayout from "../../../layout/CommonLayout";
import http from '../../../../config/http';

interface AuditLog {
    id: number;
    userEmail: string;
    action: string;
    clientIp: string;
    requestUri: string;
    durationMs: number;
    errorMessage: string | null;
    createdAt: string;
}

const AdminLogList: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const res = await http.get('/admin/audit/logs?size=100&sort=id,desc');
                if (res.data) {
                    setLogs(res.data?.content || []);
                }
            } catch (error) {
                console.error("감사 로그 로드 실패:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, []);

    return (
        <main className="w-full max-w-6xl px-4 py-12 mx-auto">
            <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">🛡️ 시스템 감사 로그 (Audit Logs)</h2>
                <p className="mb-8 text-sm text-gray-500">
                    시스템의 모든 주요 접근 및 변경 사항을 기록한 블랙박스 로그입니다. (INTEGRATED_ADMIN 전용)
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-sm font-semibold text-gray-600 border-t border-b border-gray-100 bg-gray-50/50">
                                <th className="px-4 py-4 whitespace-nowrap">ID</th>
                                <th className="px-4 py-4 whitespace-nowrap">발생 일시</th>
                                <th className="px-4 py-4 whitespace-nowrap">행위자(User)</th>
                                <th className="px-4 py-4">동작(Action)</th>
                                <th className="px-4 py-4 whitespace-nowrap">IP 주소</th>
                                <th className="px-4 py-4">접근 URI</th>
                                <th className="px-4 py-4 whitespace-nowrap text-right">소요 시간(ms)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">로그 데이터를 불러오는 중입니다...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 font-medium text-center text-gray-400">기록된 감사 로그가 없습니다.</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="transition border-b border-gray-100 hover:bg-gray-50/50 text-sm">
                                        <td className="px-4 py-4 font-mono text-gray-500">#{log.id}</td>
                                        <td className="px-4 py-4 text-gray-600 space-nowrap">{log.createdAt}</td>
                                        <td className="px-4 py-4 font-bold text-gray-800">{log.userEmail}</td>
                                        <td className="px-4 py-4 font-medium text-indigo-600">{log.action}</td>
                                        <td className="px-4 py-4 font-mono text-xs text-gray-500">{log.clientIp}</td>
                                        <td className="px-4 py-4 text-xs tracking-tighter text-gray-400 break-all">{log.requestUri}</td>
                                        <td className="px-4 py-4 font-mono text-right text-gray-600">{log.durationMs}ms</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

export default AdminLogList;
