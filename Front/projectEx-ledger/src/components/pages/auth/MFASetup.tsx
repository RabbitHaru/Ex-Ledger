import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import http from '../../../config/http';
import { Button } from '../common/Button';
import { OtpInput } from '../common/OtpInput';
import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

const MFASetup: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email;

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const fetchedRef = React.useRef(false);

    useEffect(() => {
        if (!email) {
            navigate('/login');
            return;
        }

        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const fetchSetupData = async () => {
            try {
                const response = await http.post('/auth/mfa/setup', { email });
                if (response.data && response.data.data) {
                    setQrCodeUrl(response.data.data.qrCodeUrl);
                    setSecretKey(response.data.data.secretKey);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'MFA 설정 정보를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchSetupData();
    }, [email, navigate]);

    const handleVerify = async (e: React.FormEvent, mfaCodeArg?: string) => {
        e.preventDefault();
        setError('');

        try {
            const codeNum = mfaCodeArg ? Number(mfaCodeArg) : Number(otpCode);
            await http.post('/auth/mfa/enable', { email, code: codeNum });
            toast.success('구글 OTP 인증 설정이 완료되었습니다. 다시 로그인해 주세요.');
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP 코드 검증에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 text-blue-600">
                    <ShieldCheck size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">2단계 인증 세팅</h2>
                <p className="text-sm text-gray-500 mt-2">
                    EX-LEDGER 시스템 접근을 위해<br />Google Authenticator 등록이 필수입니다.
                </p>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded-xl flex items-center gap-2 text-sm">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-6">
                <ol className="list-decimal list-inside text-sm text-slate-600 space-y-3 mb-6">
                    <li>스토어에서 <strong>Google OTP</strong> 앱을 설치합니다.</li>
                    <li>앱 실행 후 <strong>QR 코드 스캔</strong>을 선택하고 아래 바코드를 인식시켜 주세요.</li>
                </ol>

                <div className="flex justify-center bg-white p-4 rounded-xl shadow-sm mb-4 border border-slate-100">
                    {qrCodeUrl ? (
                        <div className="p-2 border-4 border-slate-100 rounded-lg">
                            <QRCodeSVG value={qrCodeUrl} size={150} level="M" />
                        </div>
                    ) : (
                        <div className="w-[150px] h-[150px] bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 text-xs">
                            QR LOAD FAILED
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-100 py-2 px-3 rounded-lg font-mono">
                    <KeyRound size={14} />
                    <span>{secretKey || "..."}</span>
                </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-4">
                    <label className="block text-center text-sm font-bold text-slate-700">구글 OTP 앱 6자리 코드</label>
                    <OtpInput
                        value={otpCode}
                        onChange={setOtpCode}
                        onComplete={(code) => {
                            handleVerify({ preventDefault: () => { } } as any, code);
                        }}
                    />
                </div>

                <Button type="submit" className="w-full mt-2">
                    설정 완료 및 검증
                </Button>
            </form>
        </div>
    );
};

export default MFASetup;
