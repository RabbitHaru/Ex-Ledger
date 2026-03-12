import React, { useState, useEffect } from "react";
import { UserCircle, ShieldCheck, Key, RefreshCw, CheckCircle2, AlertCircle, Building2, UserMinus, LogOut } from "lucide-react";
import http from "../../../config/http";
import { useToast } from "../../notification/ToastProvider";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "../../../context/WalletContext";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRight, CreditCard, Landmark, AlertTriangle, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const MyPage: React.FC = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { getWalletDataById, setBusinessNumber: setWalletBNo } = useWallet();
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
    const [isVerifyingCurrentOtp, setIsVerifyingCurrentOtp] = useState(false);
    const [currentOtp, setCurrentOtp] = useState("");
    const [mfaData, setMfaData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [otpCode, setOtpCode] = useState("");

    // 탭 상태 관리
    const [activeTab, setActiveTab] = useState<'security' | 'corporate' | 'banking'>('security');

    // 회원탈퇴 확인 모달 상태
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    // 회원 프로필 정보 상태
    const [profile, setProfile] = useState<{
        name: string;
        email: string;
        role: string;
        isApproved: boolean;
        companyName: string | null;
        businessNumber: string;
        mfaEnabled: boolean;
        adminApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
        mfaResetAt: string | null;
        mfaCooldownEnd: string | null;
        realName: string | null;
        withdrawalRequestedAt: string | null;
    } | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await http.get("/auth/me");
            const data = response.data.data;
            setProfile(data);
            
            if (data.businessNumber) {
                setWalletBNo(data.businessNumber); // WalletContext에 사업자 번호 동기화
            }
            
            // 기존 상태값 동기화
            setBankName(data.bankName || "");
            setAccountNumber(data.accountNumber || "");
            setAccountHolder(data.accountHolder || "");
            setAllowNoti(data.allowNotifications);

            // 기업 유저인데 승인 안됐으면 기업 탭을 우선으로 보여줄 수도 있음 (선택 사항)
            if (!data.isApproved && (data.role === 'ROLE_COMPANY_ADMIN' || data.role === 'ROLE_COMPANY_USER')) {
                setActiveTab('corporate');
            }
        } catch (err) {
            showToast("프로필 정보를 불러오는데 실패했습니다.", "ERROR");
        }
    };

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
        const isCompanyRole =
            profile?.role === "ROLE_COMPANY_ADMIN" ||
            profile?.role === "ROLE_COMPANY_USER";
        if (isCompanyRole && profile?.isApproved === false) {
            showToast("소속 승인 후 계좌 관리를 이용할 수 있습니다.", "ERROR");
            return;
        }
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

    const startMfaSetup = async (otpCodeForVerify?: string) => {
        try {
            const payload: any = {};
            if (otpCodeForVerify) {
                payload.currentOtpCode = Number(otpCodeForVerify);
            }
            const response = await http.post("/auth/mfa/setup", payload);
            setMfaData(response.data.data);
            setIsMfaSetting(true);
            setIsVerifyingCurrentOtp(false);
            setCurrentOtp("");
        } catch (err: any) {
            const msg = err.response?.data?.message || "";
            if (msg === "MFA_CURRENT_CODE_REQUIRED") {
                // MFA가 이미 활성화 → 기존 OTP 입력 단계로
                setIsVerifyingCurrentOtp(true);
            } else {
                showToast(msg || "MFA 설정 요청 실패", "ERROR");
            }
        }
    };

    const handleMfaVerify = async () => {
        try {
            const userEmail = profile?.email;
            if (!userEmail) {
                showToast("사용자 이메일 정보를 찾을 수 없습니다.", "ERROR");
                return;
            }
            if (!otpCode || otpCode.length !== 6) {
                showToast("6자리 OTP 번호를 입력해주세요.", "ERROR");
                return;
            }
            await http.post("/auth/mfa/enable", { email: userEmail, code: otpCode });
            showToast("MFA(OTP)가 성공적으로 설정되었습니다.", "SUCCESS");
            setIsMfaSetting(false);
            setMfaData(null);
            setOtpCode("");
            fetchProfile(); // 상태 갱신 (mfaEnabled)
        } catch (err: any) {
            const msg = err.response?.data?.message || "인증번호가 일치하지 않습니다.";
            showToast(msg, "ERROR");
        }
    };

    const handleRevokeMe = async () => {
        if (profile?.isApproved === false) {
            showToast("승인 대기 중에는 소속 해제를 요청할 수 없습니다.", "ERROR");
            return;
        }
        if (!window.confirm("정말로 기업 소속을 해제하시겠습니까? 승인 대기 상태로 변경되며 기업 기능을 이용할 수 없게 됩니다.")) return;
        try {
            await http.post("/company/users/revoke-me");
            showToast("기업 소속이 해제되었습니다.", "SUCCESS");
            fetchProfile(); // 상태 갱신
        } catch (err: any) {
            showToast(err.response?.data?.message || "소속 해제 실패", "ERROR");
        }
    };

    const handleWithdraw = async () => {
        toast("정말 회원 탈퇴를 진행하시겠습니까?", {
            description: "유예 기간이 지난 뒤 모든 정보가 삭제됩니다.",
        });
        setShowWithdrawModal(true);
    };

    const handleCancelWithdraw = async () => {
        try {
            const res = await http.post("/auth/withdraw/cancel");
            if (res?.data?.status !== "SUCCESS") {
                throw new Error(res?.data?.message || "탈퇴 철회 실패");
            }
            showToast("회원 탈퇴 요청이 철회되었습니다.", "SUCCESS");
            fetchProfile();
        } catch (err: any) {
            showToast(err.response?.data?.message || err.message || "탈퇴 철회 실패", "ERROR");
        }
    };

    const confirmWithdraw = async () => {
        if (withdrawing) return;
        setWithdrawing(true);
        try {
            const res = await http.delete("/auth/withdraw");
            if (res?.data?.status !== "SUCCESS") {
                throw new Error(res?.data?.message || "탈퇴 요청 실패");
            }
            setShowWithdrawModal(false);
            showToast("탈퇴 요청이 접수되었습니다.", "SUCCESS");
            fetchProfile();
        } catch (err: any) {
            showToast(err.response?.data?.message || err.message || "탈퇴 요청 실패", "ERROR");
        } finally {
            setWithdrawing(false);
        }
    };

    // 탭 구성을 위한 데이터
    const isCompanyRole =
        profile?.role === "ROLE_COMPANY_ADMIN" ||
        profile?.role === "ROLE_COMPANY_USER";
    const isCompanyPending = isCompanyRole && profile?.isApproved === false;

    const tabs = [
        { id: 'security', label: '보안 및 설정', icon: ShieldCheck },
        { 
            id: 'corporate', 
            label: '기업 정보', 
            icon: Building2, 
            show: profile?.role !== 'ROLE_USER' || !!profile?.businessNumber 
        },
        { id: 'banking', label: '결제 및 계좌', icon: Key, show: !isCompanyPending },
    ].filter(tab => tab.show !== false);

    // 개인 가상계좌 정보
    const personalWallet = getWalletDataById(profile?.email || '');
    const personalAccount = personalWallet?.userAccount || '';
    const personalKrw = personalWallet?.balances?.KRW || 0;

    return (
        <>
        <div className="p-12 mx-auto space-y-12 max-w-6xl duration-500 animate-in fade-in">
            <header className="flex gap-8 items-center mb-4">
                <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center text-teal-400 shadow-2xl shadow-slate-200">
                    <UserCircle size={40} />
                </div>
                <div>
                    <div className="flex gap-4 items-center">
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900">{profile?.name || "사용자"}</h1>
                        {profile?.role === "ROLE_COMPANY_ADMIN" ? (
                            <div className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider ${
                                profile?.adminApprovalStatus === 'APPROVED' 
                                ? "bg-teal-50 text-teal-600 border border-teal-100" 
                                : profile?.adminApprovalStatus === 'REJECTED'
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                            }`}>
                                {profile?.adminApprovalStatus === 'APPROVED' ? "사업자 승인됨" : 
                                 profile?.adminApprovalStatus === 'REJECTED' ? "승인 반려됨" : "사업자 심사 중"}
                            </div>
                        ) : profile?.role === "ROLE_COMPANY_USER" ? (
                            <div className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-wider ${
                                profile?.isApproved 
                                ? "bg-teal-50 text-teal-600 border border-teal-100" 
                                : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                            }`}>
                                {profile?.isApproved ? "소속 승인됨" : "소속 승인 대기"}
                            </div>
                        ) : null}
                    </div>
                    <p className="flex gap-2 items-center mt-2 text-sm font-bold tracking-widest uppercase text-slate-400">
                        {profile?.role.replace("ROLE_", "").replace("_", " ")} | {profile?.email}
                        {profile?.realName && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 text-teal-500 rounded text-[10px] font-black lowercase tracking-normal">
                                <CheckCircle2 size={10} />
                                실명인증: {profile.realName}
                            </span>
                        )}
                    </p>
                </div>
            </header>

            {/* ★ 회원 탈퇴 유예 기간 안내 배너 */}
            {profile?.withdrawalRequestedAt && (
                <div className="p-8 bg-rose-50 border border-rose-100 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700">
                    <div className="flex gap-6 items-center">
                        <div className="p-5 text-rose-500 bg-white rounded-3xl shadow-sm">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black tracking-tight text-rose-900">회원 탈퇴가 대기 중입니다</h3>
                            <p className="text-sm font-bold leading-relaxed text-rose-600/80">
                                {new Date(new Date(profile.withdrawalRequestedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                })}에 모든 정보가 삭제될 예정입니다. <br />
                                아직 마음이 바뀌셨다면 아래 버튼을 눌러 탈퇴를 철회하실 수 있습니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCancelWithdraw}
                        className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-[14px] hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center gap-2"
                    >
                        <RotateCcw size={18} />
                        탈퇴 요청 철회하기
                    </button>
                </div>
            )}

            {/* 🌟 세련된 탭 네비게이션 */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-[32px] w-fit border border-slate-100">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2.5 px-8 py-4 rounded-[26px] text-[14px] font-black transition-all ${
                            activeTab === tab.id 
                            ? "bg-white text-slate-900 shadow-lg shadow-slate-200/50" 
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="duration-500 animate-in fade-in slide-in-from-bottom-4">
                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                        {/* 비밀번호 변경 섹션 */}
                        <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                            <div className="flex gap-4 items-center">
                                <div className="p-4 text-blue-600 bg-blue-50 rounded-2xl">
                                    <ShieldCheck size={24} />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-800">보안 비밀번호 변경</h2>
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

                        {/* 알림 설정 및 MFA 섹션 */}
                        <div className="space-y-10">
                            <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-12">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-4 items-center">
                                            <div className="p-4 text-teal-600 bg-teal-50 rounded-2xl">
                                                <ShieldCheck size={24} />
                                            </div>
                                            <h2 className="text-2xl font-black tracking-tight text-slate-800">서비스 알림 수신</h2>
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
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-4 items-center">
                                            <div className="p-4 text-rose-600 bg-rose-50 rounded-2xl">
                                                <RefreshCw size={24} />
                                            </div>
                                            <h2 className="text-2xl font-black tracking-tight text-slate-800">2차 인증 (MFA)</h2>
                                        </div>
                                        {profile?.mfaEnabled && (
                                            <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                활성화됨
                                            </div>
                                        )}
                                    </div>

                                    {/* ★ MFA 쿨다운 경고 (데이터가 있을 때만) */}
                                    {profile?.mfaCooldownEnd && new Date(profile.mfaCooldownEnd) > new Date() && (
                                        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[32px] flex items-start gap-4 animate-in slide-in-from-top-4">
                                            <div className="p-3 text-rose-500 bg-white rounded-2xl shadow-sm">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-[14px] font-black text-rose-900">금융거래 제한 안내 (쿨다운)</h4>
                                                <p className="text-[12px] font-bold text-rose-600/80 leading-relaxed">
                                                    보안을 위해 OTP 재설정 후 24시간 동안 송금이 제한됩니다.<br />
                                                    제한 해제: <span className="text-rose-700 underline underline-offset-2">
                                                        {new Date(profile.mfaCooldownEnd).toLocaleString('ko-KR', { 
                                                            month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                        })}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!isMfaSetting && !isVerifyingCurrentOtp ? (
                                        <div className="space-y-6">
                                            <p className="text-[14px] font-bold text-slate-500 leading-relaxed px-2">
                                                송금 및 주요 금융 설정 변경 시에만 OTP 번호를 요구합니다. <br />
                                                {profile?.mfaEnabled 
                                                    ? "재설정 시 기존 OTP 인증이 필요합니다." 
                                                    : "분실 시 고객센터에 문의해주세요."}
                                            </p>
                                            <button
                                                onClick={() => startMfaSetup()}
                                                className="w-full py-6 border-[3px] border-dashed border-slate-100 text-slate-400 rounded-3xl font-black text-[13px] hover:border-teal-500 hover:text-teal-600 transition-all flex items-center justify-center gap-3"
                                            >
                                                <RefreshCw size={18} />
                                                {profile?.mfaEnabled ? "OTP 보안키 재설정 (기존 OTP 인증 필요)" : "OTP 보안키 설정"}
                                            </button>

                                            {/* OTP 분실 시 본인인증으로 초기화 */}
                                            {profile?.mfaEnabled && (
                                                <button
                                                    onClick={async () => {
                                                        // PortOne V2 본인인증 호출
                                                        const PortOne = (window as any).PortOne;
                                                        if (!PortOne) {
                                                            showToast("본인인증 모듈(V2)을 불러올 수 없습니다. 페이지를 새로고침 해주세요.", "ERROR");
                                                            return;
                                                        }

                                                        try {
                                                            const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
                                                            const channelKey = import.meta.env.VITE_PORTONE_AUTH_CHANNEL_KEY;

                                                            if (!storeId || !channelKey) {
                                                                showToast("본인인증 설정(STORE_ID/CHANNEL_KEY)이 누락되었습니다.", "ERROR");
                                                                return;
                                                            }

                                                            const res = await PortOne.requestIdentityVerification({
                                                                storeId: storeId,
                                                                channelKey: channelKey,
                                                                identityVerificationId: `mfa-reset-${Date.now()}`,
                                                            });

                                                            if (res.code == null && res.identityVerificationId) {
                                                                // V2는 성공 시 에러 코드가 없음 (res.code가 undefined/null)
                                                                // txId 또는 identityVerificationId를 통해 백엔드에서 확인
                                                                try {
                                                                    // V2의 결과인 txId 또는 identityVerificationId를 백엔드로 전송
                                                                    const response = await http.post("/auth/mfa/reset-by-identity", { 
                                                                        impUid: res.txId || res.identityVerificationId 
                                                                    });
                                                                    setMfaData(response.data.data);
                                                                    setIsMfaSetting(true);
                                                                    showToast("본인인증 확인 완료! 새 OTP를 설정해주세요.", "SUCCESS");
                                                                } catch (err: any) {
                                                                    showToast(err.response?.data?.message || "본인인증 기반 OTP 초기화에 실패했습니다.", "ERROR");
                                                                }
                                                            } else {
                                                                showToast(`본인인증 실패: ${res.message || '인증이 취소되었습니다.'}`, "ERROR");
                                                            }
                                                        } catch (err: any) {
                                                            showToast("본인인증 과정 중 오류가 발생했습니다.", "ERROR");
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className="w-full py-5 bg-rose-50 text-rose-500 rounded-3xl font-black text-[12px] hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-200"
                                                >
                                                    🆘 OTP 분실? 본인인증으로 초기화
                                                </button>
                                            )}
                                        </div>
                                    ) : isVerifyingCurrentOtp ? (
                                        /* ★ 기존 OTP 인증 단계 */
                                        <div className="space-y-6 animate-in slide-in-from-right-4">
                                            <div className="p-8 bg-amber-50 rounded-[32px] border border-amber-200 space-y-3">
                                                <h4 className="text-[15px] font-black text-amber-800 flex items-center gap-2">
                                                    🔐 기존 OTP 인증 필요
                                                </h4>
                                                <p className="text-[13px] font-medium text-amber-700 leading-relaxed">
                                                    보안을 위해 현재 사용 중인 인증 앱의 OTP 코드를 입력하세요.<br />
                                                    기존 OTP를 분실한 경우 고객센터에 연락해주세요.
                                                </p>
                                            </div>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="현재 OTP 6자리"
                                                autoFocus
                                                className="w-full px-10 py-6 bg-white border-2 border-amber-200 rounded-3xl text-center text-3xl font-black tracking-[0.6em] outline-none focus:ring-8 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
                                                value={currentOtp}
                                                onChange={(e) => setCurrentOtp(e.target.value.replace(/[^0-9]/g, ""))}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && currentOtp.length === 6) startMfaSetup(currentOtp); }}
                                            />
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => { setIsVerifyingCurrentOtp(false); setCurrentOtp(""); }}
                                                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[14px]"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={() => startMfaSetup(currentOtp)}
                                                    disabled={currentOtp.length !== 6}
                                                    className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-black text-[14px] disabled:opacity-40 transition-all"
                                                >
                                                    확인 후 재설정 진행
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in slide-in-from-right-4">
                                            <div className="flex flex-col items-center gap-8 p-10 bg-slate-50 rounded-[40px]">
                                                {mfaData?.qrCodeUrl && (
                                                    <div className="p-6 bg-white rounded-3xl border shadow-xl shadow-slate-200 border-slate-100">
                                                        <QRCodeSVG value={mfaData.qrCodeUrl} size={160} />
                                                    </div>
                                                )}
                                                <div className="space-y-3 text-center">
                                                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">인증 앱에서 코드를 생성하세요</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
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
                                                        className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[14px]"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={handleMfaVerify}
                                                        className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-black text-[14px]"
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
                )}

                {activeTab === 'corporate' && (
                    <div className="space-y-10">
                        {/* 상세 승인 상태 안내창 - 최종 승인(APPROVED)이 아닌 경우에만 표시 */}
                        {!profile?.isApproved && profile?.adminApprovalStatus !== 'APPROVED' && (profile?.role === "ROLE_COMPANY_ADMIN" || profile?.role === "ROLE_COMPANY_USER") && (
                            <div className={`${profile?.adminApprovalStatus === 'REJECTED' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'} rounded-[48px] p-12 flex flex-col gap-8 animate-in slide-in-from-top-4`}>
                                <div className="flex gap-8 items-start">
                                    <div className={`p-6 bg-white rounded-3xl ${profile?.adminApprovalStatus === 'REJECTED' ? 'text-rose-500' : 'text-amber-500'} shadow-sm`}>
                                        <AlertCircle size={40} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className={`text-2xl font-black ${profile?.adminApprovalStatus === 'REJECTED' ? 'text-rose-900' : 'text-amber-900'}`}>
                                            {profile?.adminApprovalStatus === 'REJECTED' ? "사업자 승인이 반려되었습니다" : 
                                             profile?.role === "ROLE_COMPANY_ADMIN" ? "사업자 승인 심사 대기 중입니다" : "기업 소속 승인 대기 중입니다"}
                                        </h3>
                                        <p className={`text-[16px] ${profile?.adminApprovalStatus === 'REJECTED' ? 'text-rose-700' : 'text-amber-700'} font-medium leading-relaxed`}>
                                            {profile?.adminApprovalStatus === 'REJECTED' ? (
                                                <>첨부하신 사업자등록증 정보가 불명확하거나 유효하지 않습니다. <br />아래에서 사업자등록증을 다시 첨부하여 재제출해주세요.</>
                                            ) : profile?.role === "ROLE_COMPANY_ADMIN" ? (
                                                <>{profile?.businessNumber} 사업자로 승인 요청이 접수되었습니다. <br />사업자 승인 전까지는 정산 및 외환 거래 기능 이용이 제한됩니다.</>
                                            ) : (
                                                <>현재 소속 기업 관리자의 승인을 기다리고 있습니다. <br />승인이 완료된 후 기업 전용 기능을 이용하실 수 있습니다.</>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* 재제출 UI — 반려된 기업 관리자에게만 표시 */}
                                {profile?.adminApprovalStatus === 'REJECTED' && profile?.role === 'ROLE_COMPANY_ADMIN' && (
                                    <div className="p-8 space-y-5 bg-white rounded-3xl border border-rose-200">
                                        <h4 className="text-[15px] font-black text-rose-800 flex items-center gap-2">
                                            📎 사업자등록증 재제출
                                        </h4>
                                        <div className="flex gap-4 items-center">
                                            <label className="flex flex-1 gap-3 items-center px-5 py-4 bg-rose-50 rounded-2xl border border-rose-200 border-dashed transition-all cursor-pointer hover:bg-rose-100">
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    id="resubmit-license-input"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const fileNameDisplay = document.getElementById('resubmit-file-name');
                                                            if (fileNameDisplay) fileNameDisplay.textContent = file.name;
                                                        }
                                                    }}
                                                />
                                                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                <span id="resubmit-file-name" className="text-[13px] font-bold text-rose-500">사업자등록증 파일 선택 (이미지/PDF)</span>
                                            </label>
                                            <button
                                                onClick={async () => {
                                                    const fileInput = document.getElementById('resubmit-license-input') as HTMLInputElement;
                                                    const file = fileInput?.files?.[0];
                                                    if (!file) {
                                                        showToast('사업자등록증 파일을 먼저 선택해주세요.', 'ERROR');
                                                        return;
                                                    }
                                                    try {
                                                        // 1. 파일 업로드
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        const uploadRes = await http.post('/auth/upload-license', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' }
                                                        });
                                                        const uuid = uploadRes.data?.uuid || uploadRes.data?.data?.uuid;

                                                        // 2. 재제출 API 호출
                                                        await http.post('/company/resubmit-license', { licenseFileUuid: uuid });
                                                        showToast('사업자등록증이 재제출되었습니다. 심사가 다시 진행됩니다.', 'SUCCESS');
                                                        window.location.reload();
                                                    } catch (err: any) {
                                                        showToast(err.response?.data?.message || '재제출에 실패했습니다.', 'ERROR');
                                                    }
                                                }}
                                                className="px-6 py-4 bg-rose-600 text-white rounded-2xl text-[13px] font-black hover:bg-rose-700 transition-all shadow-lg whitespace-nowrap"
                                            >
                                                재제출하기
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-rose-400 font-medium">
                                            * 재제출 후 관리자 심사가 다시 진행됩니다. 심사 완료까지 1~2 영업일이 소요될 수 있습니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-12">
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4 items-center">
                                    <div className="p-4 text-indigo-600 bg-indigo-50 rounded-2xl">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-800">소속 기업 및 사업자 정보</h2>
                                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1">Corporate Details</p>
                                    </div>
                                </div>
                                {profile?.role === "ROLE_COMPANY_USER" && profile?.isApproved && (
                                    <button
                                        onClick={handleRevokeMe}
                                        className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[13px] hover:bg-rose-100 transition-all flex items-center gap-2"
                                    >
                                        <UserMinus size={16} />
                                        소속 해제 요청
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">사업자 등록번호</label>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">{profile?.businessNumber || "미등록"}</p>
                                </div>
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">심사 상태</label>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">
                                        {profile?.role === "ROLE_COMPANY_USER"
                                            ? (profile?.isApproved ? "소속 승인됨" : "소속 승인 대기")
                                            : profile?.adminApprovalStatus === 'APPROVED' ? "최종 승인됨" :
                                              profile?.adminApprovalStatus === 'REJECTED' ? "반려 처리" : "심사 진행 중"}
                                    </p>
                                </div>
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">멤버십 등급</label>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">Standard Corporate</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'banking' && (
                    <div className="space-y-10 duration-500 animate-in fade-in slide-in-from-bottom-8">
                        <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-12">
                            <div className="flex gap-4 items-center">
                                <div className="p-4 text-teal-600 bg-teal-50 rounded-2xl">
                                    <Landmark size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-800">연결된 가상계좌 정보</h2>
                                    <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1">Virtual Account Summary</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                {/* 개인 계좌 카드 - 개인 유저인 경우에만 표시 */}
                                {profile?.role === 'ROLE_USER' && personalAccount && (
                                    <div className="p-10 bg-slate-50 rounded-[40px] space-y-8 group transition-all hover:bg-white hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-2 border border-transparent hover:border-slate-100">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg w-fit uppercase tracking-widest">Personal</div>
                                                <h3 className="text-xl font-black text-slate-900">개인 활동 계좌</h3>
                                            </div>
                                            <div className="p-3 bg-white rounded-2xl shadow-sm transition-colors text-slate-400 group-hover:text-teal-500">
                                                <Landmark size={20} />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">계좌 번호</label>
                                                <p className="font-mono text-xl font-bold text-slate-900">
                                                    {personalAccount}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">보유 잔액</label>
                                                <p className="text-3xl italic font-black text-slate-900">
                                                    ₩ {personalKrw.toLocaleString()} <span className="text-xs not-italic opacity-30">KRW</span>
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => navigate('/wallet/overview')}
                                            className="w-full py-5 bg-white border border-slate-100 rounded-2xl font-black text-[13px] text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            개인 자산관리 바로가기
                                            <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* 개인: 계좌 미발급 상태 → 발급 페이지 이동 CTA */}
                                {profile?.role === 'ROLE_USER' && !personalAccount && (
                                    <div className="p-10 bg-slate-50 rounded-[40px] space-y-8 border border-slate-100 text-center flex flex-col items-center justify-center">
                                        <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-300">
                                            <CreditCard size={28} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-900">가상계좌 미발급</h3>
                                            <p className="text-[12px] font-bold text-slate-400">발급을 진행해 주세요.</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/seller/dashboard')}
                                            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[13px] hover:bg-black transition-all flex items-center gap-2"
                                        >
                                            계좌 발급 페이지로 이동
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* 기업 공금 계좌 카드 (기업 사용자만) */}
                                {(profile?.role === 'ROLE_COMPANY_ADMIN' || profile?.role === 'ROLE_COMPANY_USER') && getWalletDataById(profile?.businessNumber || '')?.userAccount ? (
                                    <div className="p-10 bg-indigo-50/50 rounded-[40px] border border-indigo-100 space-y-8 group transition-all hover:bg-white hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 hover:border-indigo-100 lg:col-span-2">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <div className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg w-fit uppercase tracking-widest">Corporate Account</div>
                                            <h3 className="text-xl font-black text-slate-900">{profile?.companyName || '소속 기업 계좌'}</h3>
                                        </div>
                                            <div className="p-3 text-indigo-400 bg-white rounded-2xl shadow-sm transition-colors group-hover:text-indigo-600">
                                                <Building2 size={20} />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">공용 계좌 번호</label>
                                                <p className="font-mono text-xl font-bold text-slate-900">
                                                    {getWalletDataById(profile?.businessNumber || '')?.userAccount || '미발급 (관리자 확인 필요)'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">공금 잔액</label>
                                                <p className="text-3xl italic font-black text-slate-900">
                                                    ₩ {(getWalletDataById(profile?.businessNumber || '')?.balances.KRW || 0).toLocaleString()} <span className="text-xs not-italic opacity-30">KRW</span>
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => navigate('/corporate/wallet')}
                                            className="w-full py-5 bg-white border border-indigo-100 rounded-2xl font-black text-[13px] text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                        >
                                            기업 자산관리 바로가기
                                            <ArrowRight size={16} className="transition-transform group-hover/btn:translate-x-1" />
                                        </button>
                                    </div>
                                ) : null}

                                {/* 기업 계좌 미발급 시: 관리자만 CTA 노출 */}
                                {(profile?.role === 'ROLE_COMPANY_ADMIN') && !getWalletDataById(profile?.businessNumber || '')?.userAccount && (
                                    <div className="p-10 bg-indigo-50/30 border border-indigo-100 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 lg:col-span-2">
                                        <div className="p-4 rounded-2xl bg-white text-indigo-400 shadow-sm">
                                            <Building2 size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[14px] font-black text-slate-900">기업 공금 계좌 미발급</p>
                                            <p className="text-[12px] font-bold text-slate-500">기업 관리자만 개설할 수 있습니다.</p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/corporate/wallet')}
                                            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[13px] hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            기업 계좌 개설하기
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                )}

                                {/* 기업 멤버(실무)에게는 미발급 안내만 */}
                                {(profile?.role === 'ROLE_COMPANY_USER') && !getWalletDataById(profile?.businessNumber || '')?.userAccount && (
                                    <div className="p-10 bg-slate-50/50 border border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 lg:col-span-2">
                                        <div className="p-4 rounded-2xl bg-white text-slate-300 shadow-sm">
                                            <CreditCard size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[14px] font-black text-slate-900">기업 공금 계좌 미발급</p>
                                            <p className="text-[12px] font-bold text-slate-400">기업 관리자에게 개설을 요청하세요.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="bg-slate-900 p-12 rounded-[48px] text-white relative overflow-hidden group">
                           <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 rounded-full blur-3xl transition-all duration-700 bg-teal-500/10 group-hover:bg-teal-500/20" />
                           <div className="flex relative z-10 flex-col gap-8 justify-between items-center md:flex-row">
                               <div className="space-y-4">
                                   <div className="flex gap-2 items-center">
                                       <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-[9px] font-black rounded uppercase tracking-widest">Next Phase</span>
                                       <h4 className="text-2xl italic font-black tracking-tighter">Advanced Corporate Banking</h4>
                                   </div>
                                   <p className="max-w-lg text-sm font-bold leading-relaxed text-slate-400">
                                       Ex-Ledger V2에서는 실시간 다중 통화 가상계좌 발급 및 <br />
                                       법인카드 통합 관리 기능을 제공할 예정입니다.
                                   </p>
                               </div>
                               <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 backdrop-blur-sm">
                                   <RefreshCw size={40} className="text-teal-400 animate-spin-slow" />
                               </div>
                           </div>
                        </section>
                    </div>
                )}
            </div>

            {/* 회원 탈퇴 영역 - 작고 은밀하게 */}
            {profile?.role !== 'ROLE_INTEGRATED_ADMIN' && (
                <footer className="flex flex-col gap-6 items-center pt-12 mt-20 border-t border-slate-50">
                    <p className="text-slate-300 text-[13px] font-bold">더 이상 서비스를 이용하지 않으시나요?</p>
                    {profile?.withdrawalRequestedAt ? (
                        <button
                            onClick={handleCancelWithdraw}
                            className="text-teal-500 hover:text-teal-600 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                        >
                            <RotateCcw size={12} />
                            회원 탈퇴 철회하기
                        </button>
                    ) : (
                        <button
                            onClick={handleWithdraw}
                            className="text-slate-300 hover:text-rose-500 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 opacity-50 hover:opacity-100"
                        >
                            <LogOut size={12} />
                            회원 탈퇴하기
                        </button>
                    )}
                    <p className="text-slate-200 text-[10px] font-medium mt-4">© 2026 Ex-Ledger Team. All rights reserved.</p>
                </footer>
            )}
        </div>

        {/* 회원탈퇴 확인 모달 (토스트 액션 클릭이 막히는 환경을 위한 확실한 대안) */}
        {showWithdrawModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !withdrawing && setShowWithdrawModal(false)} />
                <div className="relative bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-md w-full p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                            <AlertTriangle size={18} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">회원 탈퇴 확인</h3>
                    </div>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        유예 기간 이후 계정과 데이터가 완전히 삭제됩니다. 계속하시겠습니까?
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowWithdrawModal(false)}
                            disabled={withdrawing}
                            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-slate-50 transition-all"
                        >
                            취소
                        </button>
                        <button
                            onClick={confirmWithdraw}
                            disabled={withdrawing}
                            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-600 transition-all disabled:opacity-50"
                        >
                            {withdrawing ? "처리 중..." : "탈퇴하기"}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default MyPage;
