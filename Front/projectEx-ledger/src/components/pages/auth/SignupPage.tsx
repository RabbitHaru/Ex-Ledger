import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import http from '../../../config/http';
import { Turnstile } from '@marsidev/react-turnstile';
import { PasswordStrength } from '../common/PasswordStrength';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Check, User, Building2, ShieldCheck, FileCheck, KeyRound, ShieldAlert } from 'lucide-react';
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

    // 스텝 관리
    const [currentStep, setCurrentStep] = useState(1);
    const isCompany = activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER';
    const totalSteps = isCompany ? 5 : 4; // OTP 설정 스텝 추가

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

    const toggleAllTerms = (checked: boolean) => {
        setTermsService(checked);
        setTermsFinance(checked);
        setTermsAml(checked);
        setTermsOptional(checked);
    };

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

    // 스텝 유효성 검사
    const validateStep = (step: number): boolean => {
        setError('');
        if (step === 1) {
            if (!email) { setError('이메일을 입력해주세요.'); emailRef.current?.focus(); return false; }
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
        // 본인인증 스텝
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
            // 약관 단계에서 다음을 누를 때 MFA 설정 요청
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

        // 이미 OTP 정보가 로드되어 있다면 중복 요청 방지
        if (otpSecret && otpQrUrl) {
            setCurrentStep((prev) => prev + 1);
            setOtpLoading(false);
            return;
        }

        // OTP 세팅 정보 로드 (계정 생성 전)
        setOtpLoading(true);
        setOtpError('');
        try {
            const setupRes = await http.post('/auth/mfa/setup-registration', { email });
            if (setupRes.data && setupRes.data.status === 'SUCCESS' && setupRes.data.data) {
                setOtpQrUrl(setupRes.data.data.qrCodeUrl);
                setOtpSecret(setupRes.data.data.secretKey);
                
                // OTP 설정 스텝으로 이동
                setCurrentStep(totalSteps);
                toast.info('보안을 위해 OTP 설정을 진행합니다.');
            } else {
                setOtpError(setupRes.data?.message || 'OTP 설정 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'OTP 설정 정보를 불러오지 못했습니다.';
            setError(msg);
            toast.error(msg);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleFinalSignup = async (providedCode?: string) => {
        const finalCode = providedCode || otpCode;
        
        setError('');
        setOtpError('');

        if (!turnstileToken) {
            setOtpError('보안 인증(Turnstile)을 먼저 완료해 주세요.');
            toast.error('보안 인증을 완료해야 가입이 가능합니다.');
            return;
        }

        if (!finalCode || finalCode.length !== 6) {
            setOtpError('OTP 코드 6자리를 정확히 입력해 주세요.');
            return;
        }

        setOtpLoading(true);

        try {
            const fakeLicenseUuid = activeTab === 'COMPANY_ADMIN' ? 'some-fake-uuid.pdf' : undefined;
            const signupRes = await http.post('/auth/signup', {
                email,
                password,
                name,
                roleType: activeTab,
                businessNumber: isCompany ? businessNumber : undefined,
                portoneImpUid: portoneImpUid || undefined,
                licenseFileUuid: fakeLicenseUuid,
                turnstileToken,
                mfaSecret: otpSecret,
                mfaCode: finalCode
            });

            if (signupRes.data && signupRes.data.data) {
                const { accessToken, refreshToken } = signupRes.data.data;
                if (accessToken) setToken(accessToken);
                if (refreshToken) setRefreshToken(refreshToken);
                
                toast.success('회원가입 및 OTP 설정이 완료되었습니다.');
                navigate('/');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data?.data || '회원가입에 실패했습니다.';
            setOtpError(msg);
            toast.error(msg);
            // 만약 Turnstile 토큰이 만료되었다면 리셋이 필요할 수 있음
            // 모든 에러 시 보안 세션 만료 가능성을 염두에 두고 Turnstile 리셋
            setTurnstileToken(null);
            if (turnstileRef.current) {
                turnstileRef.current.reset();
            }

            if (msg.includes('Turnstile')) {
                toast.error('보안 인증이 만료되었습니다. 다시 체크해 주세요.');
            } else {
                toast.error('보안을 위해 봇 방지 인증을 다시 진행해 주세요.');
            }
        } finally {
            setOtpLoading(false);
        }
    };

    // 실제 렌더링 스텝 번호 → 콘텐츠 매핑
    const getStepContent = () => {
        if (isCompany) return currentStep; // 1=기본, 2=기업, 3=인증, 4=약관, 5=OTP
        // 개인: 1=기본, 2=인증, 3=약관, 4=OTP
        if (currentStep === 1) return 1; // 기본 정보
        if (currentStep === 2) return 3; // 본인 인증
        if (currentStep === 3) return 4; // 약관 동의
        if (currentStep === 4) return 5; // OTP 설정
        return currentStep;
    };

    const contentStep = getStepContent();

    return (
        <>
            <div className="w-full max-w-3xl md:max-w-4xl mx-auto py-12 px-4">
            <header className="text-center mb-8">
                <h2 className="text-5xl font-black text-slate-900 tracking-tight">계정 만들기</h2>
                <p className="text-slate-400 font-bold text-[14px] uppercase tracking-[0.2em] mt-3">Ex-Ledger 글로벌 네트워크에 합류하세요</p>
            </header>

            {error && (
                <div className="px-6 py-5 mb-8 text-[14px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-[28px] animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            <form onSubmit={handleRequestMfaSetup} noValidate>
                {/* ====== STEP 1: 기본 정보 + 유형 선택 ====== */}
                <div className={`transition-all duration-500 ${contentStep === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute -translate-y-4 pointer-events-none'}`}>
                    <div className="flex p-1.5 bg-slate-100 rounded-[24px] mb-8 shadow-inner flex-nowrap overflow-x-auto">
                        <button type="button" className={`flex-1 py-3.5 text-[13px] font-black rounded-[18px] transition-all whitespace-nowrap ${activeTab === 'USER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => { setActiveTab('USER'); setCurrentStep(1); }}>
                            개인 회원
                        </button>
                        <button type="button" className={`flex-1 py-3.5 text-[13px] font-black rounded-[18px] transition-all whitespace-nowrap ${activeTab === 'COMPANY_USER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => { setActiveTab('COMPANY_USER'); setCurrentStep(1); }}>
                            기업 멤버
                        </button>
                        <button type="button" className={`flex-1 py-3.5 text-[13px] font-black rounded-[18px] transition-all whitespace-nowrap ${activeTab === 'COMPANY_ADMIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            onClick={() => { setActiveTab('COMPANY_ADMIN'); setCurrentStep(1); }}>
                            기업 관리자
                        </button>
                    </div>

                    <div className="space-y-5 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <Input ref={emailRef} label="이메일" type="email" placeholder="example@exledger.com" value={email} onChange={(e) => setEmail(e.target.value)} className="text-[16px]" required autoFocus />
                        <div>
                            <Input ref={passwordRef} label="비밀번호" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handlePasswordKeyEvent} onKeyUp={handlePasswordKeyEvent} className="text-[16px]" required />
                            {capsLockOn && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="text-amber-500 text-sm">⚠</span>
                                    <span className="text-[11px] font-bold text-amber-600">Caps Lock이 켜져 있습니다</span>
                                </div>
                            )}
                            <PasswordStrength password={password} />
                        </div>
                        <div>
                            <Input label="비밀번호 재입력" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={handlePasswordKeyEvent} onKeyUp={handlePasswordKeyEvent} className="text-[16px]" required />
                            {confirmPassword && password !== confirmPassword && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="text-red-500 text-sm">✖</span>
                                    <span className="text-[11px] font-bold text-red-500">비밀번호가 일치하지 않습니다</span>
                                </div>
                            )}
                            {confirmPassword && password === confirmPassword && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                                    <span className="text-teal-500 text-sm">✔</span>
                                    <span className="text-[11px] font-bold text-teal-600">비밀번호가 일치합니다</span>
                                </div>
                            )}
                        </div>
                        <Input ref={nameRef} label="이름" type="text" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} className="text-[16px]" required />
                    </div>
                </div>

                {/* ====== STEP 2: 기업 정보 (기업만) ====== */}
                <div className={`transition-all duration-500 ${contentStep === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute -translate-y-4 pointer-events-none'}`}>
                    <div className="space-y-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Building2 size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">기업 정보 입력</h3>
                                <p className="text-[12px] font-bold text-slate-400">사업자 등록 정보를 입력해주세요.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Input ref={businessRef} label="사업자등록번호" type="text" placeholder="000-00-00000"
                                    value={businessNumber}
                                    onChange={(e) => { setBusinessNumber(e.target.value.replace(/[^0-9]/g, '')); }}
                                    maxLength={10} required />
                            </div>

                            {activeTab === 'COMPANY_ADMIN' && (
                                <div className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                        <label className="block text-[13px] font-black text-indigo-900 uppercase tracking-tight">사업자등록증 업로드 (필수)</label>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*, .pdf" onChange={handleFileChange}
                                        className="block w-full text-[12px] text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-2xl file:border-0 file:text-[12px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all cursor-pointer shadow-sm shadow-indigo-100" />
                                    <p className="text-[11px] font-bold text-indigo-600/70 leading-relaxed">준비하신 사업자등록증 파일을 선택해 주세요. 관리자 확인 후 가입이 승인됩니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ====== STEP: 본인 인증 ====== */}
                <div className={`transition-all duration-500 ${contentStep === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute -translate-y-4 pointer-events-none'}`}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">실명 본인인증</h3>
                                <p className="text-[12px] font-bold text-slate-400">안전한 금융 서비스를 위해 1회 인증이 필요합니다.</p>
                            </div>
                        </div>

                        <button type="button"
                            className={`w-full py-6 rounded-[24px] text-[15px] font-black transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                                isPortoneVerified
                                    ? "bg-teal-50 text-teal-600 border border-teal-100"
                                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200"
                            }`}
                            disabled={isPortoneVerified}
                            onClick={handlePortoneVerification}>
                            {isPortoneVerified ? (
                                <><Check size={20} /> 본인인증 완료</>
                            ) : (
                                "실명 본인인증 시작하기"
                            )}
                        </button>

                        <p className="text-[11px] font-bold text-slate-400 leading-relaxed text-center">
                            인증 데이터는 즉시 암호화 처리 후 OTP 재발급을 위해 저장됩니다.
                        </p>
                    </div>
                </div>

                {/* ====== STEP: 약관 동의 + Turnstile ====== */}
                <div className={`transition-all duration-500 ${contentStep === 4 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute -translate-y-4 pointer-events-none'}`}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <FileCheck size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">약관 동의</h3>
                                <p className="text-[12px] font-bold text-slate-400">서비스 이용을 위해 약관에 동의해주세요.</p>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl">
                            <div className="relative">
                                <input type="checkbox" checked={isAllMandatoryChecked} onChange={(e) => { setTermsService(e.target.checked); setTermsFinance(e.target.checked); setTermsAml(e.target.checked); }}
                                    className="peer appearance-none w-6 h-6 bg-white border border-slate-200 rounded-lg checked:bg-teal-600 checked:border-teal-600 transition-all cursor-pointer" />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <span className="text-[15px] font-black text-slate-800">필수 약관 전체 동의</span>
                        </label>

                        <div className="h-[1px] bg-slate-100" />

                        <div className="space-y-4">
                            {[
                                { key: 'service' as const, label: '[필수] 서비스 이용약관', title: '서비스 이용약관', state: termsService, setter: setTermsService },
                                { key: 'finance' as const, label: '[필수] 전자금융거래 이용약관', title: '전자금융거래 이용약관', state: termsFinance, setter: setTermsFinance },
                                { key: 'aml' as const, label: '[필수] AML 및 고객확인 절차 동의', title: 'AML 및 고객확인 절차 동의', state: termsAml, setter: setTermsAml },
                                { key: 'marketing' as const, label: '[선택] 마케팅 및 이벤트 수신 동의', title: '마케팅 수신 동의', state: termsOptional, setter: setTermsOptional },
                            ].map((term) => (
                                <div key={term.key} className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={term.state} onChange={(e) => term.setter(e.target.checked)}
                                            className="peer appearance-none w-5 h-5 bg-white border border-slate-200 rounded-md checked:bg-slate-800 transition-all" />
                                        <span className="text-[14px] font-bold text-slate-500">{term.label}</span>
                                    </label>
                                    <button type="button" className="text-[11px] font-black text-slate-400 hover:text-teal-600 underline underline-offset-4"
                                        onClick={() => openTermsModal(term.key, term.title)}>상세보기</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ====== STEP: OTP 설정 ====== */}
                <div className={`transition-all duration-500 ${contentStep === 5 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute -translate-y-4 pointer-events-none'}`}>
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <KeyRound size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">2단계 인증(OTP) 등록</h3>
                                <p className="text-[12px] font-bold text-slate-400">Google Authenticator로 QR을 스캔하고 6자리 코드를 입력하세요.</p>
                            </div>
                        </div>

                        {otpError && (
                            <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-2">
                                <ShieldAlert size={16} /> {otpError}
                            </div>
                        )}

                        <div className="flex justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            {otpLoading ? (
                                <div className="w-[150px] h-[150px] bg-slate-100 rounded-lg animate-pulse" />
                            ) : otpQrUrl ? (
                                <div className="p-2 border-4 border-slate-100 rounded-lg bg-white">
                                    <QRCodeSVG value={otpQrUrl} size={160} level="M" />
                                </div>
                            ) : (
                                <div className="w-[150px] h-[150px] bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs">
                                    QR LOAD FAILED
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-100 py-2 px-3 rounded-lg font-mono">
                            <KeyRound size={14} />
                            <span>{otpSecret || "..."}</span>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-center text-sm font-bold text-slate-700">앱에 표시된 6자리 코드</label>
                            <OtpInput
                                value={otpCode}
                                onChange={setOtpCode}
                                onComplete={handleFinalSignup}
                            />
                        </div>

                        <div className="flex justify-center p-4 border border-slate-100 rounded-[24px] mt-4">
                            <Turnstile 
                                ref={turnstileRef}
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                                onSuccess={(token) => setTurnstileToken(token)}
                                onExpire={() => {
                                    setTurnstileToken(null);
                                    toast.warning('보안 인증이 만료되었습니다. 다시 체크해 주세요.');
                                }}
                                onError={() => {
                                    setTurnstileToken(null);
                                    toast.error('보안 인증 중 오류가 발생했습니다.');
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* 하단 네비게이션 버튼 */}
                <div className="flex gap-3 mt-8">
                    {currentStep > 1 && (
                        <button type="button" onClick={handlePrev}
                            className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[24px] font-black text-[15px] hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <ArrowLeft size={18} /> 이전
                        </button>
                    )}
                    {currentStep < totalSteps - 1 ? (
                        <button type="button" onClick={handleNext}
                            className="flex-[2] py-5 bg-slate-900 text-white rounded-[24px] font-black text-[15px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2">
                            다음 <ArrowRight size={18} />
                        </button>
                    ) : currentStep === totalSteps - 1 ? (
                        <button type="button" onClick={handleNext}
                            className="flex-[2] py-5 bg-slate-900 text-white rounded-[24px] font-black text-[15px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2">
                            다음 <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleFinalSignup()}
                            className={`flex-[2] py-5 rounded-[24px] font-black text-[15px] transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                !otpCode || otpCode.length !== 6 || otpLoading || !turnstileToken
                                    ? "bg-slate-200 text-slate-400 shadow-none"
                                    : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-100"
                            }`}
                            disabled={!otpCode || otpCode.length !== 6 || otpLoading || !turnstileToken}
                        >
                            {otpLoading ? (
                                '처리 중...'
                            ) : (
                                <>
                                    {otpCode.length === 6 && <Check size={18} />}
                                    OTP 설정 완료 및 가입
                                </>
                            )}
                        </button>
                    )}
                </div>
            </form>

            <footer className="mt-10 text-center">
                <p className="text-[12px] font-bold text-slate-400">
                    이미 계정이 있으신가요?{' '}
                    <Link to="/login" className="text-teal-600 hover:underline ml-1">로그인하기</Link>
                </p>
            </footer>
        </div>

        {/* Terms Modal */}
        {modalOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setModalOpen(false)} />
                <div className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 border border-white/20">
                    <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{modalTitle}</h3>
                        <button onClick={() => setModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all active:scale-95">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} className="w-6 h-6 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </header>
                    <div className="p-10 max-h-[60vh] overflow-y-auto bg-white custom-scrollbar">
                        <div className="text-slate-600 text-[17px] font-medium leading-[1.8] whitespace-pre-line tracking-tight">{modalContent}</div>
                    </div>
                    <footer className="px-10 py-8 bg-slate-50 border-t border-slate-100">
                        <Button type="button" className="w-full py-5 rounded-[28px] font-black text-[17px] bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all active:scale-[0.98]" onClick={() => setModalOpen(false)}>
                            확인했습니다
                        </Button>
                    </footer>
                </div>
            </div>,
            document.body
        )}
        </>
    );
};

export default SignupPage;
