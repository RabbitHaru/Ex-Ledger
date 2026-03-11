import React, { useState, useEffect } from "react";
import { UserCircle, ShieldCheck, Key, RefreshCw, CheckCircle2, AlertCircle, Building2, UserMinus, LogOut } from "lucide-react";
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

    // 탭 상태 관리
    const [activeTab, setActiveTab] = useState<'security' | 'corporate' | 'banking'>('security');

    // 회원 프로필 정보 상태
    const [profile, setProfile] = useState<{
        name: string;
        email: string;
        role: string;
        isApproved: boolean;
        businessNumber: string;
        mfaEnabled: boolean;
        adminApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    } | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await http.get("/auth/me");
            const data = response.data.data;
            setProfile(data);
            
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
            const userEmail = profile?.email;
            if (!userEmail) {
                showToast("사용자 이메일 정보를 찾을 수 없습니다.", "ERROR");
                return;
            }
            await http.post("/auth/mfa/enable", { email: userEmail, code: Number(otpCode) });
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
        if (!window.confirm("정말로 회원 탈퇴를 진행하시겠습니까? 모든 개인 정보가 삭제되며 복구할 수 없습니다.")) return;
        try {
            await http.delete("/auth/withdraw");
            showToast("회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.", "SUCCESS");
            // 로컬 스토리지 정리 및 로그인 페이지 이동
            localStorage.clear();
            window.location.href = "/login";
        } catch (err: any) {
            showToast(err.response?.data?.message || "회원 탈퇴 실패", "ERROR");
        }
    };

    // 탭 구성을 위한 데이터
    const tabs = [
        { id: 'security', label: '보안 및 설정', icon: ShieldCheck },
        { 
            id: 'corporate', 
            label: '기업 정보', 
            icon: Building2, 
            show: profile?.role !== 'ROLE_USER' || !!profile?.businessNumber 
        },
        { id: 'banking', label: '결제 및 계좌', icon: Key },
    ].filter(tab => tab.show !== false);

    return (
        <div className="max-w-6xl mx-auto p-12 space-y-12 animate-in fade-in duration-500">
            <header className="flex items-center gap-8 mb-4">
                <div className="w-20 h-20 bg-slate-900 rounded-[28px] flex items-center justify-center text-teal-400 shadow-2xl shadow-slate-200">
                    <UserCircle size={40} />
                </div>
                <div>
                    <div className="flex items-center gap-4">
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
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2">
                        {profile?.role.replace("ROLE_", "").replace("_", " ")} | {profile?.email}
                    </p>
                </div>
            </header>

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

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* 비밀번호 변경 섹션 */}
                        <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
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
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
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
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
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

                                    {!isMfaSetting ? (
                                        <div className="space-y-6">
                                            <p className="text-[14px] font-bold text-slate-500 leading-relaxed px-2">
                                                송금 및 주요 금융 설정 변경 시에만 OTP 번호를 요구합니다. <br />
                                                분실 시 아래 버튼으로 즉시 재설정이 가능합니다.
                                            </p>
                                            <button
                                                onClick={startMfaSetup}
                                                className="w-full py-6 border-[3px] border-dashed border-slate-100 text-slate-400 rounded-3xl font-black text-[13px] hover:border-teal-500 hover:text-teal-600 transition-all flex items-center justify-center gap-3"
                                            >
                                                <RefreshCw size={18} />
                                                OTP 보안키 및 재설정
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in slide-in-from-right-4">
                                            <div className="flex flex-col items-center gap-8 p-10 bg-slate-50 rounded-[40px]">
                                                {mfaData?.qrCodeUrl && (
                                                    <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100">
                                                        <QRCodeSVG value={mfaData.qrCodeUrl} size={160} />
                                                    </div>
                                                )}
                                                <div className="text-center space-y-3">
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
                        {/* 상세 승인 상태 안내창 */}
                        {!profile?.isApproved && (profile?.role === "ROLE_COMPANY_ADMIN" || profile?.role === "ROLE_COMPANY_USER") && (
                            <div className={`${profile?.adminApprovalStatus === 'REJECTED' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'} rounded-[48px] p-12 flex items-start gap-8 animate-in slide-in-from-top-4`}>
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
                                            <>첨부하신 사업자등록증 정보가 불명확하거나 유효하지 않습니다. <br />고객센터 문의 또는 정보 수정을 통해 다시 신청해주세요.</>
                                        ) : profile?.role === "ROLE_COMPANY_ADMIN" ? (
                                            <>{profile?.businessNumber} 사업자로 승인 요청이 접수되었습니다. <br />사업자 승인 전까지는 정산 및 외환 거래 기능 이용이 제한됩니다.</>
                                        ) : (
                                            <>현재 소속 기업 관리자의 승인을 기다리고 있습니다. <br />승인이 완료된 후 기업 전용 기능을 이용하실 수 있습니다.</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-12">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-slate-800">소속 기업 및 사업자 정보</h2>
                                        <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1">Corporate Details</p>
                                    </div>
                                </div>
                                {profile?.role === "ROLE_COMPANY_USER" && (
                                    <button
                                        onClick={handleRevokeMe}
                                        className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[13px] hover:bg-rose-100 transition-all flex items-center gap-2"
                                    >
                                        <UserMinus size={16} />
                                        소속 해제 요청
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">사업자 등록번호</label>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">{profile?.businessNumber || "미등록"}</p>
                                </div>
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">심사 상태</label>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                                        {profile?.adminApprovalStatus === 'APPROVED' ? "최종 승인됨" : 
                                         profile?.adminApprovalStatus === 'REJECTED' ? "반려 처리" : "심사 진행 중"}
                                    </p>
                                </div>
                                <div className="p-10 bg-slate-50 rounded-[40px] space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">멤버십 등급</label>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">Standard Corporate</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'banking' && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-in fade-in slide-in-from-bottom-8">
                        <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 relative">
                            <Key size={56} />
                            <div className="absolute -right-2 -top-2 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12">
                                <RefreshCw size={20} className="animate-spin-slow" />
                            </div>
                        </div>
                        <div className="text-center space-y-4 max-w-md">
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">가상계좌 서비스 준비 중</h3>
                            <p className="text-slate-400 font-bold leading-relaxed">
                                더욱 안전하고 편리한 통합 결제 및 가상계좌 관리 기능을 준비하고 있습니다. <br />
                                서비스 고도화 완료 후 이곳에서 가상계좌 발급 및 내역 확인이 가능합니다.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="px-5 py-2 bg-slate-100 rounded-full text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                Phase 2: Virtual Accounts
                            </div>
                            <div className="px-5 py-2 bg-amber-50 rounded-full text-[11px] font-black text-amber-600 uppercase tracking-widest border border-amber-100">
                                Coming Soon
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 회원 탈퇴 영역 - 작고 은밀하게 */}
            {profile?.role !== 'ROLE_INTEGRATED_ADMIN' && (
                <footer className="mt-20 pt-12 border-t border-slate-50 flex flex-col items-center gap-6">
                    <p className="text-slate-300 text-[13px] font-bold">더 이상 서비스를 이용하지 않으시나요?</p>
                    <button
                        onClick={handleWithdraw}
                        className="text-slate-300 hover:text-rose-500 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 opacity-50 hover:opacity-100"
                    >
                        <LogOut size={12} />
                        회원 탈퇴하기
                    </button>
                    <p className="text-slate-200 text-[10px] font-medium mt-4">© 2026 Ex-Ledger Team. All rights reserved.</p>
                </footer>
            )}
        </div>
    );
};

export default MyPage;
