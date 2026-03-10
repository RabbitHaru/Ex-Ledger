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

    const handlePortoneVerification = () => {
        // [TODO] 실제 포트원 SDK 연동창 띄우기 (샌드박스)
        // 임시로 바로 성공 처리 및 더미 UID 세팅
        toast.success("포트원 본인인증 샌드박스 화면이 호출됩니다 (임시 성공 처리).");
        setIsPortoneVerified(true);
        setPortoneImpUid("imp_dummy_12345");
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
            setError('휴대폰 본인인증을 완료해주세요.');
            return;
        }

        if (!termsRequired) {
            setError('필수 약관에 동의해주세요.');
            termsRef.current?.focus();
            return;
        }

        if (!turnstileToken) {
            setError('Turnstile (봇 방지) 인증이 완료되지 않았습니다.');
            return;
        }

        try {
            // [TODO] 실제 서버 연동 시 licenseFile 을 FormData로 묶어서 /api/file/upload 등에 먼저 전송한 후, 반환된 uuid를 사용.
            // 지금은 임시 uuid를 보냅니다.
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
        <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">회원가입</h2>

            <div className="flex mb-6 border-b border-gray-200">
                <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'USER'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('USER')}
                >
                    일반 유저
                </button>
                <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'COMPANY_USER'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('COMPANY_USER')}
                >
                    사내 멤버 등록
                </button>
                <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'COMPANY_ADMIN'
                        ? 'border-teal-600 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('COMPANY_ADMIN')}
                >
                    신규 기업 등록
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
                <Input
                    ref={emailRef}
                    label="이메일"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <Input
                    ref={passwordRef}
                    label="비밀번호"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Input
                    ref={nameRef}
                    label="이름"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                {(activeTab === 'COMPANY_ADMIN' || activeTab === 'COMPANY_USER') && (
                    <div className="space-y-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input
                                    ref={businessRef}
                                    label="사업자등록번호 (10자리 숫자)"
                                    type="text"
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
                                <Button
                                    type="button"
                                    onClick={handleVerifyBusiness}
                                    disabled={isBusinessVerified || verifying || businessNumber.length !== 10}
                                    className={isBusinessVerified ? "bg-slate-400 cursor-not-allowed" : "bg-slate-600 hover:bg-slate-700"}
                                >
                                    {verifying ? '확인 중...' : isBusinessVerified ? '인증됨' : '진위확인'}
                                </Button>
                            )}
                        </div>
                        {activeTab === 'COMPANY_ADMIN' && (
                            <p className="text-xs text-gray-500">
                                * 기업 최초 등록 시 국세청 진위확인이 진행됩니다.
                            </p>
                        )}
                        {activeTab === 'COMPANY_USER' && (
                            <p className="text-xs text-gray-500">
                                * 사내 관리자가 가입 시 등록한 동일한 사업자 번호를 입력해야 소속될 수 있습니다.
                            </p>
                        )}

                        {activeTab === 'COMPANY_ADMIN' && (
                            <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                <h3 className="font-semibold text-sm text-gray-700">추가 도용 방지 심사</h3>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">사업자등록증 (사본)</label>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*, .pdf"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                    />
                                    <p className="text-xs text-gray-500">심사용 파일은 업로드 즉시 암호화되어 관리자 외에는 열람 불가합니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="p-4 border rounded-md space-y-2 bg-indigo-50/50">
                    <label className="block text-sm font-medium text-gray-700">실명 및 연락처 인증 (필수)</label>
                    <Button
                        type="button"
                        className={`w-full ${isPortoneVerified ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
                        disabled={isPortoneVerified}
                        onClick={handlePortoneVerification}
                    >
                        {isPortoneVerified ? "✅ 본인인증 완료" : "휴대폰 본인인증 하기"}
                    </Button>
                    <p className="text-xs text-gray-500">안전한 금융/외환 거래를 위해 가입 시 반드시 1회 휴대폰 실명 인증을 진행합니다.</p>
                </div>

                <div className="mt-6 p-4 border rounded-md space-y-3 bg-gray-50 text-sm">
                    <label className="flex items-center space-x-2 cursor-pointer font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={termsRequired && termsOptional}
                            onChange={(e) => {
                                setTermsRequired(e.target.checked);
                                setTermsOptional(e.target.checked);
                            }}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <span>전체 약관에 동의합니다.</span>
                    </label>
                    <hr className="border-gray-200" />
                    <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                        <input
                            ref={termsRef}
                            type="checkbox"
                            checked={termsRequired}
                            onChange={(e) => setTermsRequired(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <span>[필수] 서비스 이용약관 및 개인정보 처리방침 동의</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                        <input
                            type="checkbox"
                            checked={termsOptional}
                            onChange={(e) => setTermsOptional(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <span>[선택] 혜택 및 이벤트 알림 수신 동의</span>
                    </label>
                </div>

                <div className="flex justify-center my-4">
                    <Turnstile
                        siteKey="1x00000000000000000000AA"
                        onSuccess={(token) => setTurnstileToken(token)}
                    />
                </div>

                <Button type="submit" className="w-full mt-4">
                    {activeTab === 'COMPANY_ADMIN' ? '기업 신규 등록 및 가입' : activeTab === 'COMPANY_USER' ? '사내 멤버 합류 신청' : '일반 회원 가입'}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800">
                    로그인
                </Link>
            </div>
        </div>
    );
};

export default SignupPage;
