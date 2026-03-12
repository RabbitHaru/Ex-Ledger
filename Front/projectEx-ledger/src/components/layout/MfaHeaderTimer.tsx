import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import http from '../../config/http';
import { toast } from 'sonner';
import { Clock, RefreshCw } from 'lucide-react';
import { getRefreshToken, getToken, logout, parseJwt, setRefreshToken, setToken } from '../../config/auth';

export const MfaHeaderTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const lastTokenRef = useRef<string | null>(null);

    useEffect(() => {
        const tick = () => {
            const token = getToken();
            if (!token) {
                lastTokenRef.current = null;
                setTimeLeft(null);
                return;
            }

            const payload = parseJwt(token);
            const exp = payload?.exp;
            if (typeof exp !== 'number') {
                lastTokenRef.current = null;
                setTimeLeft(null);
                return;
            }

            const authorities: string = payload?.auth || '';
            const roles = authorities.split(',').filter(Boolean);
            const isIntegratedAdmin = roles.includes('ROLE_INTEGRATED_ADMIN');
            const capSeconds = isIntegratedAdmin ? Number.POSITIVE_INFINITY : 15 * 60;

            const remainingMs = exp * 1000 - Date.now();
            const jwtRemaining = Math.max(0, Math.floor(remainingMs / 1000));
            if (jwtRemaining <= 0) {
                setTimeLeft(0);
                logout();
                return;
            }

            const tokenChanged = lastTokenRef.current !== token;
            lastTokenRef.current = token;

            setTimeLeft((prev) => {
                const initial = Math.min(jwtRemaining, capSeconds);
                if (tokenChanged || prev === null) return initial;

                const next = Math.max(0, prev - 1);
                return Math.min(next, jwtRemaining, capSeconds);
            });
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleExtend = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const rt = getRefreshToken();
            if (!rt) {
                logout();
                return;
            }

            const { data } = await axios.post(`${http.defaults.baseURL}/auth/refresh`, { refreshToken: rt });
            if (data && data.data) {
                const { accessToken, refreshToken } = data.data;
                if (accessToken) setToken(accessToken);
                if (refreshToken) setRefreshToken(refreshToken);
                toast.success('세션이 갱신되었습니다.');
            } else {
                logout();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || '세션 갱신에 실패했습니다.');
            logout();
        } finally {
            setIsRefreshing(false);
        }
    };

    if (timeLeft === null) return null;

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
                title="세션 갱신"
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
