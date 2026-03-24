import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import http from '../../../config/http';
import { toast } from 'sonner';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await http.post('/auth/password-reset/request', { email });
            setIsSent(true);
            toast.success('재설정 링크가 이메일로 발송되었습니다.');
        } catch (err: any) {
            toast.error(err.response?.data?.message || '요청 처리에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto py-20 px-4">
            <header className="text-center mb-10">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">비밀번호 찾기</h2>
                <p className="text-slate-400 font-bold text-[13px] uppercase tracking-[0.2em] mt-3 underline decoration-teal-500/30 underline-offset-8">Ex-Ledger 계정 복구</p>
            </header>

            {!isSent ? (
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-8 text-center italic">
                        가입하신 이메일 주소를 입력하시면<br/>
                        비밀번호를 재설정할 수 있는 링크를 보내드립니다.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input 
                            label="이메일 주소" 
                            type="email" 
                            placeholder="example@exledger.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button 
                            type="submit" 
                            disabled={loading || !email}
                            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] font-black text-[16px] transition-all flex items-center justify-center gap-2"
                        >
                            <Mail size={18} />
                            {loading ? '발송 중...' : '재설정 메일 보내기'}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-100 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-teal-50 text-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3">메일이 발송되었습니다!</h3>
                    <p className="text-slate-500 text-[15px] font-medium leading-relaxed mb-8 italic">
                        <span className="font-bold text-slate-900">{email}</span> 주소로<br/>
                        재설정 링크를 보냈습니다. 메일함(또는 스팸함)을 확인해주세요.
                    </p>
                    <Button onClick={() => setIsSent(false)} variant="ghost" className="w-full rounded-[24px] py-4 font-bold border-slate-200">
                        다른 이메일로 다시 시도
                    </Button>
                </div>
            )}

            <div className="mt-10 text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-[14px] font-black text-slate-400 hover:text-teal-600 transition-colors">
                    <ArrowLeft size={16} /> 로그인 페이지로 돌아가기
                </Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
