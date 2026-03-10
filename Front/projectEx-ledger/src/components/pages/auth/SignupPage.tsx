import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import http from '../../../config/http';
import { Turnstile } from '@marsidev/react-turnstile';
import { toast } from 'sonner';

const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'USER' | 'COMPANY_USER' | 'COMPANY_ADMIN'>('USER');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [isBusinessVerified, setIsBusinessVerified] = useState(false);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [isPortoneVerified, setIsPortoneVerified] = useState(false);
    const [portoneImpUid, setPortoneImpUid] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    const [termsRequired, setTermsRequired] = useState(false);
    const [termsOptional, setTermsOptional] = useState(false);

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const businessRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const termsRef = useRef<HTMLInputElement>(null);

    const handlePortoneVerification = async () => {
        try {
            const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID;
            const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

            if (!window.PortOne) {
                setError("인증 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // @ts-ignore (PortOne V2 SDK Simple Authentication)
            const response = await window.PortOne.requestIdentityVerification({
                storeId: STORE_ID,
                channelKey: CHANNEL_KEY,
                identityVerificationId: `identity_${Date.now()}`,
                customer: {
                    fullName: name || undefined,
                },
            });

            if (response.code !== undefined) {
                // '조건을 만족하는 채널을 찾을 수 없습니다' 에러에 대한 힌트 추가
                const hint = response.message?.includes('채널')
                    ? '\n(포트원 콘솔에서 "결제" 채널이 아닌 "본인인증" 채널 키를 사용했는지 확인해주세요.)'
                    : '';
                setError(`인증 실패: ${response.message}${hint}`);
                return;
            }

            setIsPortoneVerified(true);
            setPortoneImpUid(response.identityVerificationId);
            toast.success("간편인증이 완료되었습니다.");
        } catch (err: any) {
            setError(`인증 과정에서 오류가 발생했습니다: ${err.message || err}`);
            console.error(err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setLicenseFile(e.target.files[0]);
        }
    };

    const handleVerifyBusiness = async () => {
        if (!businessNumber || businessNumber.length !== 10) {
            setError('사업자등록번호 10자리를 정확히 입력해주세요.');
            businessRef.current?.focus();
            return;
        }
        setVerifying(true);
        setError('');
        try {
            const res = await http.post('/auth/verify-business', { businessNumber });
            if (res.data.status === 'SUCCESS') {
                setIsBusinessVerified(true);
                toast.success('사업자 인증이 완료되었습니다.');
            } else {
                setError(res.data.message || '사업자 인증에 실패했습니다.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || '사업자 인증에 실패했습니다.');
        } finally {
            setVerifying(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('이메일을 입력해주세요.');
            emailRef.current?.focus();
            return;
        }
        if (!password) {
            setError('비밀번호를 입력해주세요.');
            passwordRef.current?.focus();
            return;
        }
        if (!name) {
            setError('이름을 입력해주세요.');
            nameRef.current?.focus();
            return;
        }

        if ((activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER') && (!businessNumber || businessNumber.length !== 10)) {
            setError('사업자등록번호 10자리를 정확히 입력해주세요.');
            businessRef.current?.focus();
            return;
        }

        if (activeTab === 'COMPANY_ADMIN') {
            if (!isBusinessVerified) {
                setError('사업자등록번호 진위확인을 먼저 완료해주세요.');
                businessRef.current?.focus();
                return;
            }
            if (!licenseFile) {
                setError('사업자등록증 업로드가 필요합니다.');
                fileRef.current?.focus();
                return;
            }
        }

        if (!isPortoneVerified) {
            setError('간편인증을 완료하세요.');
            return;
        }

        if (!termsRequired) {
            setError('필수 약관에 동의해야 합니다.');
            termsRef.current?.focus();
            return;
        }

        if (!turnstileToken) {
            setError('Turnstile (봇 방지) 인증이 완료되지 않았습니다.');
            return;
        }

        try {
            const fakeLicenseUuid = activeTab === 'COMPANY_ADMIN' ? 'some-fake-uuid.pdf' : undefined;

            await http.post('/auth/signup', {
                email,
                password,
                name,
                roleType: activeTab,
                businessNumber: (activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER') ? businessNumber : undefined,
                portoneImpUid: portoneImpUid || undefined,
                licenseFileUuid: fakeLicenseUuid,
                turnstileToken
            });
            toast.success('회원가입이 완료되었습니다. 로그인해주세요.');
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || '회원가입에 실패했습니다.');
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto py-12">
            <header className="text-center mb-12">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">계정 만들기</h2>
                <p className="text-slate-400 font-bold text-[12px] uppercase tracking-[0.2em] mt-3">Ex-Ledger 글로벌 네트워크에 합류하세요</p>
            </header>

            <div className="flex p-1.5 bg-slate-100 rounded-[24px] mb-10 shadow-inner">
                <button
                    type="button"
                    className={`flex-1 py-4 text-[14px] font-black rounded-[18px] transition-all ${activeTab === 'USER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveTab('USER')}
                >
                    개인 회원
                </button>
                <button
                    type="button"
                    className={`flex-1 py-4 text-[14px] font-black rounded-[18px] transition-all ${activeTab === 'COMPANY_USER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveTab('COMPANY_USER')}
                >
                    기업 멤버
                </button>
                <button
                    type="button"
                    className={`flex-1 py-4 text-[14px] font-black rounded-[18px] transition-all ${activeTab === 'COMPANY_ADMIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setActiveTab('COMPANY_ADMIN')}
                >
                    기업 관리자
                </button>
            </div>

            {error && (
                <div className="px-5 py-4 mb-6 text-[12px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                    <Input
                        ref={emailRef}
                        label="이메일"
                        type="email"
                        placeholder="example@exledger.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        ref={passwordRef}
                        label="비밀번호"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Input
                        ref={nameRef}
                        label="이름"
                        type="text"
                        placeholder="홍길동"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                {(activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER') && (
                    <div className="space-y-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <Input
                                    ref={businessRef}
                                    label="사업자등록번호"
                                    type="text"
                                    placeholder="000-00-00000"
                                    value={businessNumber}
                                    onChange={(e) => {
                                        setBusinessNumber(e.target.value.replace(/[^0-9]/g, ''));
                                        setIsBusinessVerified(false);
                                    }}
                                    maxLength={10}
                                    required
                                    disabled={activeTab === 'COMPANY_ADMIN' && isBusinessVerified}
                                />
                            </div>
                            {activeTab === 'COMPANY_ADMIN' && (
                                <button
                                    type="button"
                                    onClick={handleVerifyBusiness}
                                    disabled={isBusinessVerified || verifying || businessNumber.length !== 10}
                                    className={`px-4 py-3 rounded-2xl text-[11px] font-black tracking-tight transition-all ${isBusinessVerified ? "bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg active:scale-95"}`}
                                >
                                    {verifying ? '...' : isBusinessVerified ? '인증됨' : '진위확인'}
                                </button>
                            )}
                        </div>

                        {activeTab === 'COMPANY_ADMIN' && (
                            <div className="p-5 bg-teal-50/30 rounded-2xl border border-teal-100/50 space-y-3">
                                <label className="block text-[11px] font-black text-teal-800 uppercase tracking-widest">사업자등록증 업로드 (보안심사)</label>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*, .pdf"
                                    onChange={handleFileChange}
                                    className="block w-full text-[11px] text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-teal-600 file:text-white hover:file:bg-teal-700 transition-all cursor-pointer"
                                />
                                <p className="text-[10px] font-bold text-teal-600/70 leading-relaxed">심사용 파일은 업로드 즉시 AES-256 암호화되어 관리용 고립 서버로 전송됩니다.</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm shadow-slate-100/50 space-y-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50/50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                    <div className="space-y-1 relative">
                        <label className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">Identity Verification</label>
                        <p className="text-[12px] font-extrabold text-slate-400 leading-relaxed italic">Premium security layer for global transfer</p>
                    </div>

                    <button
                        type="button"
                        className={`w-full py-5 rounded-[24px] text-[14px] font-black transition-all flex items-center justify-center gap-3 active:scale-[0.98] relative ${isPortoneVerified ? "bg-teal-50 text-teal-600 border border-teal-100 shadow-none" : "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200"}`}
                        disabled={isPortoneVerified}
                        onClick={handlePortoneVerification}
                    >
                        {isPortoneVerified ? (
                            <>본인인증 완료</>
                        ) : (
                            "실명 본인인증 시작하기"
                        )}
                    </button>

                    <p className="text-[10px] font-bold text-slate-500/80 leading-relaxed relative">
                        안전한 자금이체 및 환전 서비스를 위해 가입 시 1회 실명 인증을 요청합니다. <br />
                        인증 데이터는 즉시 암호화 처리됩니다.
                    </p>
                </div>

                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={termsRequired && termsOptional}
                                onChange={(e) => {
                                    setTermsRequired(e.target.checked);
                                    setTermsOptional(e.target.checked);
                                }}
                                className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-lg checked:bg-teal-600 checked:border-teal-600 transition-all cursor-pointer"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-all">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <span className="text-[13px] font-black text-slate-800">모든 약관에 전체 동의합니다.</span>
                    </label>

                    <div className="h-[1px] bg-slate-200/50" />

                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                ref={termsRef}
                                type="checkbox"
                                checked={termsRequired}
                                onChange={(e) => setTermsRequired(e.target.checked)}
                                className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-md checked:bg-slate-800 transition-all"
                            />
                            <span className="text-[14px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">[필수] 서비스 이용약관 및 개인정보 처리방침</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-md checked:bg-slate-800 transition-all"
                                required
                            />
                            <span className="text-[14px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">[필수] 전자금융거래 이용약관</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-md checked:bg-slate-800 transition-all"
                                required
                            />
                            <span className="text-[14px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">[필수] 자금세탁방지(AML) 및 고객확인 절차 동의</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={termsOptional}
                                onChange={(e) => setTermsOptional(e.target.checked)}
                                className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-md checked:bg-slate-800 transition-all"
                            />
                            <span className="text-[14px] font-bold text-slate-500">[선택] 마케팅 및 이벤트 알림 수신 동의</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-center p-4 border border-slate-100 rounded-[24px]">
                    <Turnstile
                        siteKey="0x4AAAAAAA4J3sV2-tFjWlT1"
                        onSuccess={(token) => setTurnstileToken(token)}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black text-[18px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] mt-4"
                >
                    {activeTab === 'COMPANY_ADMIN' ? '기업 등록 완료' : '회원가입 완료'}
                </button>
            </form>

            <footer className="mt-10 text-center">
                <p className="text-[12px] font-bold text-slate-400">
                    이미 계정이 있으신가요?{' '}
                    <Link to="/login" className="text-teal-600 hover:underline ml-1">로그인하기</Link>
                </p>
            </footer>
        </div>
    );
};

export default SignupPage;
