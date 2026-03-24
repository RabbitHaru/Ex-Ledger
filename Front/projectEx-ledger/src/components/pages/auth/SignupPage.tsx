import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import http from '../../../config/http';
import { Turnstile } from '@marsidev/react-turnstile';
import { PasswordStrength } from '../common/PasswordStrength';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, User, Building2, ShieldCheck, FileCheck, KeyRound, ShieldAlert, Mail } from 'lucide-react';
import { setRefreshToken, setToken } from '../../../config/auth';
import { QRCodeSVG } from 'qrcode.react';
import { OtpInput } from '../common/OtpInput';

const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const turnstileRef = useRef<any>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'USER' | 'COMPANY_USER' | 'COMPANY_ADMIN'>('USER');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [isBusinessVerified, setIsBusinessVerified] = useState(false);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [isPortoneVerified, setIsPortoneVerified] = useState(false);
    const [portoneImpUid, setPortoneImpUid] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [capsLockOn, setCapsLockOn] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');

    // OTP 설정 스텝 상태
    const [otpQrUrl, setOtpQrUrl] = useState('');
    const [otpSecret, setOtpSecret] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
 
    // 이메일 인증 관련 상태
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false); 
    const [emailCode, setEmailCode] = useState('');
    const [emailVerifying, setEmailVerifying] = useState(false);
 
    // 스텝 관리
    const [currentStep, setCurrentStep] = useState(1);
    const isCompany = activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER';
    const totalSteps = isCompany ? 5 : 4; 

    const termsContent = {
        service: "Ex-Ledger 서비스 이용약관\n\n1. 본 서비스는 글로벌 자금 이체 및 환전 관리 솔루션을 제공합니다.\n2. 회원은 본인의 실명으로 가입해야 하며, 타인의 정보를 도용할 수 없습니다.\n3. 불법적인 자금 세탁이나 테러 자금 조달 목적으로 서비스를 이용할 수 없습니다.\n4. 회사는 시스템 점검 등을 위해 서비스를 일시 중단할 수 있습니다.",
        finance: "전자금융거래 이용약관\n\n1. 회사는 안정적인 전자금융 서비스를 제공하기 위해 노력합니다.\n2. 이용자는 본인의 인증 수단(비밀번호, OTP 등)을 철저히 관리해야 합니다.\n3. 분실이나 도난 발생 시 즉시 고객센터로 신고해야 합니다.\n4. 거래 내역은 관련 법령에 따라 일정 기간 보존됩니다.",
        aml: "자금세탁방지(AML) 및 고객확인 절차 동의\n\n1. 회사는 '특정 금융거래정보의 보고 및 이용 등에 관한 법률'에 부합하는 절차를 준수합니다.\n2. 이용자는 가입 시 실명 확인과 사업자 진위 확인에 협조해야 합니다.\n3. 의심스러운 거래 발생 시 별도의 증빙 자료를 요구할 수 있습니다.\n4. 확인 거부 시 서비스 이용이 제한될 수 있습니다.",
        marketing: "마케팅 및 이벤트 수신 동의 (선택)\n\n1. 신규 서비스 출시, 환율 분석 보고서, 프로모션 정보를 안내해 드립니다.\n2. 이메일, SMS, 앱 푸시를 통해 제공될 수 있습니다.\n3. 동의하지 않으셔도 기본 서비스 이용은 가능합니다.\n4. 설정 메뉴에서 언제든지 수신 거부가 가능합니다."
    };

    const openTermsModal = (type: keyof typeof termsContent, title: string) => {
        setModalTitle(title);
        setModalContent(termsContent[type]);
        setModalOpen(true);
    };

    const [termsService, setTermsService] = useState(false);
    const [termsFinance, setTermsFinance] = useState(false);
    const [termsAml, setTermsAml] = useState(false);
    const [termsOptional, setTermsOptional] = useState(false);

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const businessRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const isAllMandatoryChecked = termsService && termsFinance && termsAml;

    const isPasswordStrong = (pwd: string) => {
        return pwd.length >= 8 &&
               /[a-zA-Z]/.test(pwd) &&
               /[0-9]/.test(pwd) &&
               /[^A-Za-z0-9]/.test(pwd);
    };

    const handlePasswordKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCapsLockOn(e.getModifierState('CapsLock'));
    };

    const handlePortoneVerification = async () => {
        try {
            const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID;
            const CHANNEL_KEY = import.meta.env.VITE_PORTONE_AUTH_CHANNEL_KEY;

            if (!(window as any).PortOne) {
                setError("인증 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
                return;
            }

            // @ts-ignore
            const response = await (window as any).PortOne.requestIdentityVerification({
                storeId: STORE_ID,
                channelKey: CHANNEL_KEY,
                identityVerificationId: `identity_${Date.now()}`,
                method: "PHONE",
                windowType: { pc: "POPUP", mobile: "POPUP" },
                popup: { center: true },
                customer: { fullName: name || undefined },
            });

            if (response.code !== undefined) {
                setError(`인증 실패: ${response.message}`);
                return;
            }

            setIsPortoneVerified(true);
            setPortoneImpUid(response.identityVerificationId);
            toast.success("간편인증이 완료되었습니다.");
        } catch (err: any) {
            setError(`인증 과정에서 오류가 발생했습니다: ${err.message || err}`);
        }
    };

    const handleSendEmailCode = async () => {
        if (!email || !email.includes('@')) {
            setError('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        setEmailVerifying(true);
        try {
            await http.post('/auth/email-verification/send', { email });
            setIsEmailSent(true);
            toast.success('인증 코드가 발송되었습니다.');
        } catch (err: any) {
            setError(err.response?.data?.message || '인증 코드 발송 실패');
        } finally {
            setEmailVerifying(false);
        }
    };

    const handleVerifyEmailCode = async () => {
        if (!emailCode || emailCode.length !== 6) {
            setError('6자리 코드를 입력해주세요.');
            return;
        }
        setEmailVerifying(true);
        try {
            await http.post('/auth/email-verification/verify', { email, code: emailCode });
            setIsEmailVerified(true);
            toast.success('이메일 인증 완료!');
        } catch (err: any) {
            setError(err.response?.data?.message || '인증 실패');
        } finally {
            setEmailVerifying(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setLicenseFile(e.target.files[0]);
        }
    };

    // 스텝 유효성 검사
    const validateStep = (step: number): boolean => {
        setError('');
        if (step === 1) {
            if (!email) { setError('이메일을 입력해주세요.'); emailRef.current?.focus(); return false; }
            if (!isEmailVerified) { setError('이메일 인증을 완료해주세요.'); return false; }
            if (!password) { setError('비밀번호를 입력해주세요.'); passwordRef.current?.focus(); return false; }
            if (!isPasswordStrong(password)) { setError('비밀번호가 보안 요건을 충족하지 않습니다.'); passwordRef.current?.focus(); return false; }
            if (password !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return false; }
            if (!name) { setError('이름을 입력해주세요.'); nameRef.current?.focus(); return false; }
            return true;
        }
        if (step === 2 && isCompany) {
            if (!businessNumber || businessNumber.length !== 10) { setError('사업자등록번호 10자리를 입력해주세요.'); return false; }
            if (activeTab === 'COMPANY_ADMIN' && !licenseFile) { setError('사업자등록증 업로드가 필요합니다.'); return false; }
            return true;
        }
        const verifyStep = isCompany ? 3 : 2;
        if (step === verifyStep) {
            if (!isPortoneVerified) { setError('간편인증을 완료해주세요.'); return false; }
            return true;
        }
        return true;
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            if (!validateStep(1)) return;
            try {
                await http.get('/auth/check-email', { params: { email } });
            } catch (err: any) {
                const msg = err.response?.data?.message || '이메일 중복 확인에 실패했습니다.';
                setError(msg);
                toast.error(msg);
                return;
            }
        }

        if (currentStep === (isCompany ? 4 : 3)) {
            await handleRequestMfaSetup(null as any);
            return;
        }

        if (validateStep(currentStep)) {
            setError('');
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const handlePrev = () => {
        setError('');
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleRequestMfaSetup = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');

        if (!isAllMandatoryChecked) {
            setError('모든 필수 약관에 동의해야 회원가입이 가능합니다.');
            return;
        }

        if (otpSecret && otpQrUrl) {
            setCurrentStep(totalSteps);
            return;
        }

        setOtpLoading(true);
        try {
            const setupRes = await http.post('/auth/mfa/setup-registration', { email });
            if (setupRes.data && setupRes.data.status === 'SUCCESS' && setupRes.data.data) {
                setOtpQrUrl(setupRes.data.data.qrCodeUrl);
                setOtpSecret(setupRes.data.data.secretKey);
                setCurrentStep(totalSteps);
                toast.info('보안을 위해 OTP 설정을 진행합니다.');
            } else {
                setError(setupRes.data?.message || 'OTP 설정 정보를 불러오지 못했습니다.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP 설정 정보를 불러오지 못했습니다.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleFinalSignup = async (providedCode?: string) => {
        const finalCode = providedCode || otpCode;
        if (!turnstileToken) {
            setOtpError('보안 인증(Turnstile)을 완료해 주세요.');
            return;
        }
        if (!finalCode || finalCode.length !== 6) {
            setOtpError('OTP 코드를 입력해 주세요.');
            return;
        }
        setOtpLoading(true);
        try {
            const signupRes = await http.post('/auth/signup', {
                email, password, name, roleType: activeTab,
                businessNumber: isCompany ? businessNumber : undefined,
                portoneImpUid: portoneImpUid || undefined,
                licenseFileUuid: activeTab === 'COMPANY_ADMIN' ? 'file-uuid' : undefined,
                turnstileToken, mfaSecret: otpSecret, mfaCode: finalCode
            });
            if (signupRes.data && signupRes.data.data) {
                const { accessToken, refreshToken } = signupRes.data.data;
                if (accessToken) setToken(accessToken);
                if (refreshToken) setRefreshToken(refreshToken);
                toast.success('회원가입이 완료되었습니다.');
                navigate('/');
            }
        } catch (err: any) {
            setOtpError(err.response?.data?.message || '회원가입 실패');
            setTurnstileToken(null);
            if (turnstileRef.current) turnstileRef.current.reset();
        } finally {
            setOtpLoading(false);
        }
    };

    const getStepContent = () => {
        if (isCompany) return currentStep; 
        if (currentStep === 1) return 1; 
        if (currentStep === 2) return 3; 
        if (currentStep === 3) return 4; 
        if (currentStep === 4) return 5; 
        return currentStep;
    };

    const contentStep = getStepContent();

    return (
        <div className="w-full max-w-3xl md:max-w-4xl mx-auto py-12 px-4">
            <header className="text-center mb-8">
                <h2 className="text-5xl font-black text-slate-900">계정 만들기</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest mt-3">Ex-Ledger 글로벌 네트워크</p>
            </header>

            {error && <div className="p-4 mb-6 bg-red-50 text-red-500 rounded-2xl font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">{error}</div>}

            <form onSubmit={(e) => e.preventDefault()}>
                {/* STEP 1 */}
                <div className={contentStep === 1 ? 'block animate-in fade-in duration-500' : 'hidden'}>
                    <div className="flex p-1.5 bg-slate-100 rounded-3xl mb-8 shadow-inner">
                        {['USER', 'COMPANY_USER', 'COMPANY_ADMIN'].map(t => (
                            <button key={t} type="button" onClick={() => setActiveTab(t as any)} 
                                className={`flex-1 py-3 text-[13px] font-black rounded-2xl transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                                {t === 'USER' ? '개인' : t === 'COMPANY_USER' ? '기업멤버' : '기업관리자'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="space-y-5 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Input ref={emailRef} label="이메일" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required disabled={isEmailVerified} />
                            </div>
                            {!isEmailVerified && (
                                <Button type="button" onClick={handleSendEmailCode} disabled={emailVerifying || !email} className="h-14 px-6 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm mb-0.5">
                                    {isEmailSent ? '재전송' : '인증 요청'}
                                </Button>
                            )}
                        </div>

                        {isEmailSent && !isEmailVerified && (
                            <div className="flex gap-2 items-end p-4 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex-1">
                                    <Input label="인증 코드" value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/[^0-9]/g, ''))} maxLength={6} required />
                                </div>
                                <Button type="button" onClick={handleVerifyEmailCode} disabled={emailVerifying || emailCode.length !== 6} className="h-14 px-6 rounded-2xl bg-teal-600 text-white font-bold text-sm mb-0.5">확인</Button>
                            </div>
                        )}

                        {isEmailVerified && (
                            <div className="px-4 py-3 bg-teal-50 border border-teal-100 rounded-2xl text-teal-600 text-xs font-bold flex items-center gap-2">
                                <Check size={14} /> 이메일 인증이 완료되었습니다.
                            </div>
                        )}

                        <div className="h-[1px] bg-slate-50 my-2" />

                        <Input ref={passwordRef} label="비밀번호" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handlePasswordKeyEvent} onKeyUp={handlePasswordKeyEvent} required />
                        <PasswordStrength password={password} />
                        <Input label="비밀번호 확인" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        <Input ref={nameRef} label="이름" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                </div>

                {/* STEP 2: 기업 정보 */}
                <div className={contentStep === 2 ? 'block animate-in fade-in duration-500' : 'hidden'}>
                    <div className="space-y-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={22} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">기업 정보 입력</h3>
                                <p className="text-[12px] font-bold text-slate-400">사업자 등록 정보를 입력해주세요.</p>
                            </div>
                        </div>
                        <Input ref={businessRef} label="사업자번호" value={businessNumber} onChange={e => setBusinessNumber(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required />
                        {activeTab === 'COMPANY_ADMIN' && (
                             <div className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50 space-y-4">
                                <label className="block text-[13px] font-black text-indigo-900 uppercase">사업자등록증 업로드 (필수)</label>
                                <input ref={fileRef} type="file" onChange={handleFileChange} className="block w-full text-xs" />
                             </div>
                        )}
                    </div>
                </div>

                {/* STEP 3: 본인인증 */}
                <div className={contentStep === 3 ? 'block animate-in fade-in duration-500' : 'hidden'}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm text-center space-y-6">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><ShieldCheck size={22} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">실명 본인인증</h3>
                                <p className="text-[12px] font-bold text-slate-400">안전한 자금 거래를 위해 본인인증이 필요합니다.</p>
                            </div>
                        </div>
                        <Button type="button" onClick={handlePortoneVerification} className="w-full h-20 rounded-[32px] text-lg font-black shadow-xl shadow-teal-50" variant={isPortoneVerified ? 'outline' : 'primary'}>
                            {isPortoneVerified ? <><Check className="mr-2" /> 본인인증 완료</> : '실명 본인인증 시작하기'}
                        </Button>
                    </div>
                </div>

                {/* STEP 4: 약관 */}
                <div className={contentStep === 4 ? 'block animate-in fade-in duration-500' : 'hidden'}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileCheck size={22} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">약관 동의</h3>
                                <p className="text-[12px] font-bold text-slate-400">서비스 이용을 위한 필수 동의 사항입니다.</p>
                            </div>
                        </div>
                        <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-[28px] cursor-pointer hover:bg-slate-100 transition-colors">
                            <input type="checkbox" checked={isAllMandatoryChecked} onChange={e => { setTermsService(e.target.checked); setTermsFinance(e.target.checked); setTermsAml(e.target.checked); }} 
                                className="w-6 h-6 rounded-lg text-teal-600 focus:ring-teal-500 cursor-pointer" />
                            <span className="font-black text-slate-800">필수 약관 전체 동의</span>
                        </label>
                        <div className="px-2 space-y-4">
                            {['service', 'finance', 'aml'].map(k => (
                                <div key={k} className="flex justify-between items-center bg-white">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={k === 'service' ? termsService : k === 'finance' ? termsFinance : termsAml} 
                                            onChange={e => k === 'service' ? setTermsService(e.target.checked) : k === 'finance' ? setTermsFinance(e.target.checked) : setTermsAml(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-200 text-slate-800 focus:ring-slate-500 cursor-pointer" />
                                        <span className="text-sm font-bold text-slate-500">{k === 'service' ? '[필수] 서비스 이용약관' : k === 'finance' ? '[필수] 전자금융거래' : '[필수] 자금세탁방지 동의'}</span>
                                    </label>
                                    <button type="button" onClick={() => openTermsModal(k as any, '약관 상세')} className="text-[11px] font-black text-slate-400 underline underline-offset-4">보기</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* STEP 5: OTP */}
                <div className={contentStep === 5 ? 'block animate-in fade-in duration-500' : 'hidden'}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 text-center">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><KeyRound size={22} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">보안 인증(OTP) 설정</h3>
                                <p className="text-[12px] font-bold text-slate-400">계정보호를 위해 Google Authenticator를 등록하세요.</p>
                            </div>
                        </div>
                        {otpQrUrl && (
                             <div className="flex justify-center p-6 bg-slate-50 border border-slate-100 rounded-[32px] shadow-inner">
                                <QRCodeSVG value={otpQrUrl} size={180} />
                             </div>
                        )}
                        <div className="p-4 bg-slate-100 rounded-2xl font-mono text-xs text-slate-500">{otpSecret}</div>
                        <OtpInput value={otpCode} onChange={setOtpCode} onComplete={handleFinalSignup} />
                        
                        <div className="flex justify-center py-4 bg-white border border-slate-50 rounded-3xl mt-4">
                            <Turnstile ref={turnstileRef} siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} />
                        </div>
                        {otpError && (
                             <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100"><ShieldAlert size={14} className="inline mr-1" />{otpError}</div>
                        )}
                    </div>
                </div>

                {/* NAVIGATION */}
                <div className="flex gap-4 mt-10">
                    {currentStep > 1 && (
                        <Button type="button" onClick={handlePrev} className="flex-1 h-16 rounded-[28px] font-black text-lg" variant="secondary">이전</Button>
                    )}
                    <Button type="button" onClick={currentStep === totalSteps ? () => handleFinalSignup() : handleNext} 
                        className="flex-[2] h-16 rounded-[28px] font-black text-lg shadow-xl shadow-slate-100" disabled={otpLoading}>
                        {currentStep === totalSteps ? (otpLoading ? '처리 중...' : '회원가입 완료') : (
                            <span className="flex items-center gap-2">다음 단계로 <ArrowRight size={20} /></span>
                        )}
                    </Button>
                </div>
            </form>

            <footer className="mt-12 text-center">
                <p className="text-[13px] font-bold text-slate-400">
                    이미 계정이 있으신가요? <Link to="/login" className="text-teal-600 font-black ml-2 hover:underline">로그인하기</Link>
                </p>
            </footer>

            {/* Terms Modal */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-900">{modalTitle}</h3>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-10 max-h-96 overflow-y-auto whitespace-pre-wrap text-slate-600 leading-relaxed text-[16px] custom-scrollbar">{modalContent}</div>
                        <div className="p-10 bg-slate-50 border-t border-slate-100">
                            <Button className="w-full h-16 rounded-[24px] font-black text-lg" onClick={() => setModalOpen(false)}>확인했습니다</Button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};

export default SignupPage;
