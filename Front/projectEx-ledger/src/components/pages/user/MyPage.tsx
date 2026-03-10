import React, { useState, useEffect } from "react";
import { UserCircle, ShieldCheck, Key, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import http from "../../../config/http";
import { useToast } from "../../notification/ToastProvider";
import { QRCodeSVG } from "qrcode.react";

const MyPage: React.FC = () => {
    const { showToast } = useToast();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // 계좌 정보 상태
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    // 알림 설정 상태
    const [allowNoti, setAllowNoti] = useState(true);

    const [isMfaSetting, setIsMfaSetting] = useState(false);
    const [mfaData, setMfaData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [otpCode, setOtpCode] = useState("");

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast("새 비밀번호가 일치하지 않습니다.", "ERROR");
            return;
        }

        try {
            await http.post("/auth/change-password", { currentPassword, newPassword });
            showToast("비밀번호가 성공적으로 변경되었습니다.", "SUCCESS");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            showToast(err.response?.data?.message || "비밀번호 변경 실패", "ERROR");
        }
    };

    const handleAccountUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await http.post("/auth/update-account", { bankName, accountNumber, accountHolder });
            showToast("계좌 정보가 저장되었습니다.", "SUCCESS");
        } catch (err: any) {
            showToast("계좌 정보 저장 실패", "ERROR");
        }
    };

    const handleNotiToggle = async () => {
        const newVal = !allowNoti;
        setAllowNoti(newVal);
        try {
            await http.post("/auth/update-noti", { allowNotifications: newVal });
            showToast(`알림 정책이 ${newVal ? '설정' : '해제'}되었습니다.`, "SUCCESS");
        } catch (err: any) {
            showToast("알림 설정 변경 실패", "ERROR");
        }
    };

    const startMfaSetup = async () => {
        try {
            const response = await http.post("/auth/mfa/setup", {});
            setMfaData(response.data.data);
            setIsMfaSetting(true);
        } catch (err: any) {
            showToast("MFA 설정 요청 실패", "ERROR");
        }
    };

    const handleMfaVerify = async () => {
        try {
            const userEmail = localStorage.getItem("user_email") || "";
            await http.post("/auth/mfa/enable", { email: userEmail, code: Number(otpCode) });
            showToast("MFA(OTP)가 성공적으로 설정되었습니다.", "SUCCESS");
            setIsMfaSetting(false);
            setMfaData(null);
            setOtpCode("");
        } catch (err: any) {
            showToast("인증번호가 일치하지 않습니다.", "ERROR");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-12 space-y-12 animate-in fade-in duration-500">
            <header className="flex items-center gap-8 mb-12">
                <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center text-teal-400 shadow-2xl shadow-slate-200">
                    <UserCircle size={40} />
                </div>
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900">마이페이지</h1>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">보안 설정 및 개인 정보 관리</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 비밀번호 변경 섹션 */}
                <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                            <Key size={24} />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800">로그인 비밀번호 변경</h2>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">현재 비밀번호</label>
                            <input
                                type="password"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">새 비밀번호</label>
                            <input
                                type="password"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">비밀번호 확인</label>
                            <input
                                type="password"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-5 bg-slate-900 text-white rounded-[28px] font-black text-[15px] hover:bg-slate-800 transition-all shadow-xl active:scale-95 mt-6"
                        >
                            비밀번호 업데이트
                        </button>
                    </form>
                </section>

                {/* 계좌 정보 등록 섹션 */}
                <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800">계좌 정보 관리</h2>
                    </div>

                    <form onSubmit={handleAccountUpdate} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">은행명</label>
                            <input
                                type="text"
                                placeholder="예: 국민은행"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">계좌번호</label>
                            <input
                                type="text"
                                placeholder="하이픈(-) 없이 입력"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">예금주</label>
                            <input
                                type="text"
                                placeholder="실명 입력"
                                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-5 bg-amber-600 text-white rounded-[28px] font-black text-[15px] hover:bg-amber-700 transition-all shadow-xl active:scale-95 mt-6"
                        >
                            계좌 정보 저장
                        </button>
                    </form>
                </section>

                {/* 알림 설정 및 MFA 섹션 */}
                <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-12">
                    <div className="space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                                    <ShieldCheck size={24} />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-800">서비스 알림 설정</h2>
                            </div>
                            <button
                                onClick={handleNotiToggle}
                                className={`w-14 h-8 rounded-full transition-all relative ${allowNoti ? 'bg-teal-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${allowNoti ? 'right-1' : 'left-1'} shadow-sm`} />
                            </button>
                        </div>
                        <p className="text-[14px] font-bold text-slate-400 leading-relaxed px-2">
                            정산 결과 알림, 로그인 시도 경고 및 주요 플랫폼 공지사항에 대한 알림을 수신합니다.
                        </p>
                    </div>

                    <div className="h-[1px] bg-slate-50" />

                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
                                <ShieldCheck size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-800">2차 인증 (MFA)</h2>
                        </div>

                        {!isMfaSetting ? (
                            <div className="space-y-6">
                                <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100">
                                    <p className="text-[14px] font-bold text-slate-500 leading-relaxed">
                                        <strong className="text-slate-800 block mb-2 text-[16px]">강력한 보안 보호</strong>
                                        송금 및 주요 금융 설정 변경 시에만 OTP 번호를 요구합니다. <br />
                                        분실 시 아래 버튼으로 즉시 재설정이 가능합니다.
                                    </p>
                                </div>
                                <button
                                    onClick={startMfaSetup}
                                    className="w-full py-10 border-[3px] border-dashed border-slate-100 text-slate-400 rounded-[40px] font-black text-[15px] hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/20 transition-all flex flex-col items-center gap-4"
                                >
                                    <RefreshCw size={32} />
                                    OTP 보안키 신규 등록 및 재설정
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-right-4">
                                <div className="flex flex-col items-center gap-8 p-10 bg-slate-50 rounded-[40px]">
                                    {mfaData?.qrCodeUrl && (
                                        <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                                            <QRCodeSVG value={mfaData.qrCodeUrl} size={200} />
                                        </div>
                                    )}
                                    <div className="text-center space-y-3">
                                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Google Authenticator 스캔</p>
                                        <p className="text-[15px] font-bold text-slate-600 leading-relaxed">인증 앱에서 코드를 생성한 후 <br />6자리 번호를 아래에 입력하세요.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000 000"
                                        className="w-full px-10 py-6 bg-white border-2 border-slate-100 rounded-3xl text-center text-3xl font-black tracking-[0.6em] outline-none focus:ring-8 focus:ring-teal-500/5 focus:border-teal-500 transition-all"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                                    />
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setIsMfaSetting(false)}
                                            className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black text-[15px] hover:bg-slate-200 transition-all"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleMfaVerify}
                                            className="flex-[2] py-5 bg-teal-600 text-white rounded-3xl font-black text-[15px] hover:bg-teal-700 transition-all shadow-xl active:scale-95"
                                        >
                                            설정 완료
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MyPage;
