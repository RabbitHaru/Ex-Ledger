import React, { useState, useEffect, useCallback } from 'react';
import http from '../../../config/http';
import { Button } from './Button';
import { toast } from 'sonner';

export const MfaSessionStatus: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isActive, setIsActive] = useState(false);

    const fetchSessionStatus = useCallback(async () => {
        try {
            const response = await http.get('/auth/mfa/session');
            if (response.data && response.data.data) {
                const { active, remainingSeconds } = response.data.data;
                setIsActive(active);
                if (active) {
                    setTimeLeft(remainingSeconds);
                } else {
                    setTimeLeft(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch MFA session status', error);
        }
    }, []);

    useEffect(() => {
        fetchSessionStatus();
        const interval = setInterval(fetchSessionStatus, 30000); // 30초마다 동기화
        return () => clearInterval(interval);
    }, [fetchSessionStatus]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleExtend = async () => {
        try {
            await http.post('/auth/mfa/session/extend');
            toast.success('MFA 세션이 15분 연장되었습니다.');
            fetchSessionStatus();
        } catch (error: any) {
            toast.error(error.response?.data?.message || '세션 연장에 실패했습니다.');
        }
    };

    if (!isActive || timeLeft === null) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isWarning = timeLeft < 180; // 3분 미만 시 경고

    return (
        <div className="mt-auto px-4 py-6 bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">MFA Session</span>
                <div className={`text-[13px] font-black tabular-nums ${isWarning ? 'text-red-500 animate-pulse' : 'text-teal-600'}`}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
            </div>
            
            <Button 
                onClick={handleExtend}
                variant="ghost" 
                className="w-full py-3 bg-white hover:bg-slate-100 text-[12px] font-bold text-slate-600 border border-slate-200 rounded-2xl transition-all"
            >
                시간 연장하기
            </Button>
        </div>
    );
};
