import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { PasswordStrength } from '../common/PasswordStrength';
import http from '../../../config/http';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('유효하지 않은 접근입니다.');
            navigate('/login');
        }
    }, [token, navigate]);

    const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLockOn(e.getModifierState('CapsLock'));
    };

    const isPasswordStrong = (pwd: string) => {
        return pwd.length >= 8 &&
               /[a-zA-Z]/.test(pwd) &&
               /[0-9]/.test(pwd) &&
               /[^A-Za-z0-9]/.test(pwd);
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (!isPasswordStrong(newPassword)) {
            toast.error('비밀번호 보안 요건을 충족하지 않습니다.');
            return;
        }

        setLoading(true);
        try {
            await http.post('/auth/password-reset/confirm', { 
                token: token || '', 
                newPassword 
            });
            setIsSuccess(true);
            toast.success('비밀번호가 성공적으로 변경되었습니다!');
            
            // 3초 후 로그인 페이지로 이동
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || '비밀번호 재설정에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="w-full max-w-xl mx-auto py-24 text-center">
                <div className="w-24 h-24 bg-teal-50 text-teal-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-50 animate-bounce">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">변경 완료!</h2>
                <p className="text-slate-500 font-bold mb-10 leading-relaxed italic">
                    비밀번호가 성공적으로 업데이트되었습니다.<br/>
                    새로운 비밀번호로 다시 로그인해 주세요.<br/>
                    <span className="text-teal-600 block mt-4 font-black">잠시 후 로그인 페이지로 이동합니다...</span>
                </p>
                <Button onClick={() => navigate('/login')} className="px-10 py-5 rounded-[24px]">즉시 로그인하러 가기</Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto py-20 px-4">
            <header className="text-center mb-12">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">비밀번호 재설정</h2>
                <p className="text-slate-400 font-bold text-[13px] uppercase tracking-[0.2em] mt-3">Ex-Ledger 보안 센터</p>
            </header>

            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-50 animate-in fade-in zoom-in-95 duration-500">
                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <Input 
                            label="새로운 비밀번호" 
                            type="password" 
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            onKeyDown={handlePasswordKeyEvent}
                            onKeyUp={handlePasswordKeyEvent}
                            required
                        />
                        {capsLockOn && (
                            <div className="flex items-center gap-1.5 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle className="text-amber-500" size={14} />
                                <span className="text-[11px] font-bold text-amber-600 uppercase">Caps Lock is ON</span>
                            </div>
                        )}
                        <PasswordStrength password={newPassword} />
                    </div>

                    <div>
                        <Input 
                            label="비밀번호 확인" 
                            type="password" 
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onKeyDown={handlePasswordKeyEvent}
                            onKeyUp={handlePasswordKeyEvent}
                            required
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="mt-2 text-[11px] font-bold text-red-500 tracking-tight flex items-center gap-1.5 ml-1">
                                <AlertCircle size={14} /> 비밀번호가 서로 일치하지 않습니다.
                            </p>
                        )}
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading || !newPassword || newPassword !== confirmPassword || !isPasswordStrong(newPassword)}
                        className="w-full py-5 bg-slate-900 border-none text-white rounded-[24px] font-black tracking-tight flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all disabled:grayscale disabled:opacity-30"
                    >
                        {loading ? '변경 사항 적용 중...' : '비밀번호 변경 완료'}
                    </Button>
                </form>
            </div>
            
            <p className="mt-10 text-center text-[12px] font-bold text-slate-400 max-w-sm mx-auto leading-relaxed underline underline-offset-4 decoration-slate-200">
                비밀번호를 성공적으로 변경하시면 이전 기기의 모든 로그인이 종료될 수 있습니다.
            </p>
        </div>
    );
};

export default ResetPasswordPage;
