import React, { useState, useEffect, useCallback } from 'react';
import http from '../../../../config/http';
import { Search, Filter, AlertTriangle, Clock, ChevronLeft, ChevronRight, RotateCcw, Shield } from 'lucide-react';

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

interface PageInfo {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

const AdminLogList: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [pageInfo, setPageInfo] = useState<PageInfo>({ totalElements: 0, totalPages: 0, number: 0, size: 20 });
    const [isLoading, setIsLoading] = useState(true);

    // 필터 상태
    const [searchEmail, setSearchEmail] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [errorOnly, setErrorOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const fetchLogs = useCallback(async (page: number = 0) => {
        setIsLoading(true);
        try {
            const hasFilters = searchEmail || searchKeyword || startDate || endDate || errorOnly;
            const endpoint = hasFilters ? '/admin/audit/logs/search' : '/admin/audit/logs';

            const params: any = { page, size: 20, sort: 'id,desc' };
            if (hasFilters) {
                if (searchEmail) params.userEmail = searchEmail;
                if (searchKeyword) params.keyword = searchKeyword;
                if (startDate) params.startDate = `${startDate}T00:00:00`;
                if (endDate) params.endDate = `${endDate}T23:59:59`;
                params.errorOnly = errorOnly;
            }

            const res = await http.get(endpoint, { params });
            const data = res.data?.data || res.data;
            setLogs(data?.content || []);
            setPageInfo({
                totalElements: data?.totalElements || 0,
                totalPages: data?.totalPages || 0,
                number: data?.number || 0,
                size: data?.size || 20,
            });
        } catch (error) {
            console.error("감사 로그 로드 실패:", error);
        } finally {
            setIsLoading(false);
        }
    }, [searchEmail, searchKeyword, startDate, endDate, errorOnly]);

    useEffect(() => {
        fetchLogs(currentPage);
    }, [currentPage]);

    const handleSearch = () => {
        setCurrentPage(0);
        fetchLogs(0);
    };

    const handleReset = () => {
        setSearchEmail('');
        setSearchKeyword('');
        setStartDate('');
        setEndDate('');
        setErrorOnly(false);
        setCurrentPage(0);
        setTimeout(() => fetchLogs(0), 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const getActionColor = (action: string) => {
        if (action.startsWith('POST')) return 'text-blue-600 bg-blue-50';
        if (action.startsWith('PUT') || action.startsWith('PATCH')) return 'text-amber-600 bg-amber-50';
        if (action.startsWith('DELETE')) return 'text-red-600 bg-red-50';
        return 'text-slate-600 bg-slate-50';
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <main className="w-full max-w-7xl px-4 py-12 mx-auto space-y-8 animate-in fade-in duration-500">
            {/* 헤더 */}
            <header className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-800 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">시스템 감사 로그</h1>
                    <p className="text-slate-400 font-bold text-sm mt-1">
                        모든 주요 접근 및 변경 사항을 기록한 블랙박스 로그 · 총 {pageInfo.totalElements.toLocaleString()}건
                    </p>
                </div>
            </header>

            {/* 검색/필터 바 */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-3">
                    {/* 이메일 검색 */}
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                            type="text"
                            placeholder="사용자 이메일 검색..."
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-slate-500/10 transition-all"
                        />
                    </div>
                    {/* 키워드 검색 */}
                    <div className="flex-1 min-w-[200px] relative">
                        <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                            type="text"
                            placeholder="액션/URI 키워드 검색..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-slate-500/10 transition-all"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-slate-500/10" />
                    <span className="text-slate-300 font-black">~</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold outline-none focus:ring-4 focus:ring-slate-500/10" />

                    <label className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-2xl cursor-pointer select-none">
                        <input type="checkbox" checked={errorOnly} onChange={(e) => setErrorOnly(e.target.checked)}
                            className="w-4 h-4 accent-red-500" />
                        <span className="text-[12px] font-black text-red-500 flex items-center gap-1">
                            <AlertTriangle size={13} /> 에러만
                        </span>
                    </label>

                    <div className="flex-1" />

                    <button onClick={handleReset}
                        className="px-5 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[12px] font-black hover:bg-slate-200 transition-all flex items-center gap-2">
                        <RotateCcw size={14} /> 초기화
                    </button>
                    <button onClick={handleSearch}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[12px] font-black hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
                        <Search size={14} /> 검색
                    </button>
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                                <th className="px-5 py-4">ID</th>
                                <th className="px-5 py-4">발생 일시</th>
                                <th className="px-5 py-4">행위자</th>
                                <th className="px-5 py-4">동작</th>
                                <th className="px-5 py-4">IP</th>
                                <th className="px-5 py-4">URI</th>
                                <th className="px-5 py-4 text-right">소요시간</th>
                                <th className="px-5 py-4">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                                        <span className="text-[13px] font-bold text-slate-400">로그 데이터를 불러오는 중...</span>
                                    </div>
                                </td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={8} className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Shield size={32} className="text-slate-200" />
                                        <span className="text-[13px] font-bold text-slate-300">조건에 맞는 로그가 없습니다.</span>
                                    </div>
                                </td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}
                                        className={`text-[13px] border-b border-slate-50 transition-colors hover:bg-slate-50/50 ${log.errorMessage ? 'bg-red-50/30' : ''
                                            }`}>
                                        <td className="px-5 py-4 font-mono text-[11px] text-slate-400">#{log.id}</td>
                                        <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-[12px]">{formatDate(log.createdAt)}</td>
                                        <td className="px-5 py-4 font-black text-slate-700 whitespace-nowrap">{log.userEmail}</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-mono text-[11px] text-slate-400">{log.clientIp}</td>
                                        <td className="px-5 py-4 text-[11px] text-slate-400 max-w-[200px] truncate" title={log.requestUri}>{log.requestUri}</td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={`font-mono text-[12px] font-bold ${log.durationMs > 1000 ? 'text-red-500' : log.durationMs > 300 ? 'text-amber-500' : 'text-slate-400'
                                                }`}>
                                                <Clock size={12} className="inline mr-1" />{log.durationMs}ms
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {log.errorMessage ? (
                                                <span className="flex items-center gap-1 text-[11px] font-black text-red-500" title={log.errorMessage}>
                                                    <AlertTriangle size={13} /> ERROR
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-black text-teal-500">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {pageInfo.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                        <span className="text-[12px] font-bold text-slate-400">
                            {pageInfo.number * pageInfo.size + 1} - {Math.min((pageInfo.number + 1) * pageInfo.size, pageInfo.totalElements)} / {pageInfo.totalElements.toLocaleString()}건
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
                                className="p-2 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: Math.min(5, pageInfo.totalPages) }, (_, i) => {
                                const startP = Math.max(0, Math.min(currentPage - 2, pageInfo.totalPages - 5));
                                const pageNum = startP + i;
                                if (pageNum >= pageInfo.totalPages) return null;
                                return (
                                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                                        className={`w-9 h-9 rounded-xl text-[12px] font-black transition-all ${currentPage === pageNum
                                            ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                                        {pageNum + 1}
                                    </button>
                                );
                            })}
                            <button onClick={() => setCurrentPage(Math.min(pageInfo.totalPages - 1, currentPage + 1))} disabled={currentPage >= pageInfo.totalPages - 1}
                                className="p-2 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default AdminLogList;
