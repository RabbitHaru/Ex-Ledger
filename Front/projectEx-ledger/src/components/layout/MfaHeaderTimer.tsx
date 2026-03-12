import React, { useCallback, useEffect, useState } from 'react';
import http from '../../config/http';
import { toast } from 'sonner';
import { Clock, RefreshCw } from 'lucide-react';
import { logout } from '../../config/auth';

export const MfaHeaderTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [tickEnabled, setTickEnabled] = useState(false);

    const fetchSessionStatus = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setIsActive(false);
            setTimeLeft(null);
            setTickEnabled(false);
            return;
        }

        try {
            const response = await http.get('/auth/mfa/session');
            if (response.data && response.data.data) {
                const { active, remainingSeconds } = response.data.data;
                setIsActive(active);
                if (active) {
                    setTimeLeft(remainingSeconds);
                    setTickEnabled(true);
                } else {
                    setTimeLeft(null);
                    setTickEnabled(false);
                }
            }
        } catch {
            setIsActive(false);
            setTimeLeft(null);
            setTickEnabled(false);
        }
    }, []);

    useEffect(() => {
        fetchSessionStatus();
        
        // 30초 간격 폴링
        const interval = setInterval(fetchSessionStatus, 30000);
        
        // 다른 탭이나 현재 탭에서의 로그인/로그아웃 등 토큰 변경 감지
        const handleTokenChange = () => fetchSessionStatus();
        window.addEventListener('storage', handleTokenChange);
        window.addEventListener('auth-change', handleTokenChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleTokenChange);
            window.removeEventListener('auth-change', handleTokenChange);
        };
    }, [fetchSessionStatus]);

    useEffect(() => {
        if (!tickEnabled || timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null) return null;
                if (prev > 1) return prev - 1;
                logout();
                return 0;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [tickEnabled, timeLeft]);

    const handleExtend = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await http.post('/auth/mfa/session/extend');
            toast.success('보안 세션이 15분 연장되었습니다.');
            await fetchSessionStatus();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '세션 연장에 실패했습니다.');
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!isActive || timeLeft === null) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isWarning = timeLeft < 180; 

    return (
        <div className={`flex items-center gap-3 px-4 py-1.5 border rounded-2xl transition-all duration-500 ${
            isWarning 
            ? 'bg-red-50 border-red-200 shadow-sm shadow-red-100 animate-pulse' 
            : 'bg-slate-50 border-slate-100'
        }`}>
            <div className="flex items-center gap-2">
                <Clock size={14} className={isWarning ? 'text-red-600' : 'text-slate-400'} />
                <div className="flex flex-col -space-y-1">
                    {isWarning && (
                        <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">세션 만료 임박</span>
                    )}
                    <span className={`text-[13px] font-black tabular-nums transition-colors ${isWarning ? 'text-red-600' : 'text-slate-600'}`}>
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                </div>
            </div>
            <div className={`w-[1px] h-3 ${isWarning ? 'bg-red-200' : 'bg-slate-200'}`} />
            <button 
                onClick={handleExtend}
                disabled={isRefreshing}
                title="시간 연장"
                className={`p-1 rounded-lg transition-all active:scale-90 disabled:opacity-50 ${
                    isWarning 
                    ? 'text-red-500 hover:text-red-700 hover:bg-white' 
                    : 'text-slate-400 hover:text-teal-600 hover:bg-white'
                }`}
            >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
        </div>
    );
};
