import React, { useState } from "react";
import { Megaphone, Send, CheckCircle2 } from "lucide-react";
import http from "../../../config/http";
import { useToast } from "../../notification/ToastProvider";

const AdminBroadcast: React.FC = () => {
    const { showToast } = useToast();
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);

    const handleBroadcast = async () => {
        if (!message.trim()) {
            showToast("공지 내용을 입력해주세요.", "ERROR");
            return;
        }

        if (!window.confirm(`전체 접속 사용자에게 아래 공지를 발송합니다.\n\n"${message}"\n\n발송하시겠습니까?`)) return;

        setIsSending(true);
        try {
            await http.post("/v1/notifications/broadcast", { message: message.trim() });
            showToast("전체 공지가 발송되었습니다.", "SUCCESS");
            setSentCount((prev) => prev + 1);
            setMessage("");
        } catch (err: any) {
            showToast(err.response?.data?.message || "공지 발송에 실패했습니다.", "ERROR");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-12 space-y-12 animate-in fade-in duration-500">
            <header className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-200">
                    <Megaphone size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">
                        전체 공지 발송
                    </h1>
                    <p className="text-slate-400 font-bold text-sm mt-1">
                        현재 접속 중인 모든 사용자에게 실시간 알림을 전송합니다.
                    </p>
                </div>
            </header>

            <section className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm space-y-10">
                <div className="space-y-4">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        공지 내용
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="사용자에게 전달할 공지 내용을 입력하세요..."
                        className="w-full px-8 py-6 bg-slate-50 border-none rounded-3xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none min-h-[160px]"
                        maxLength={500}
                    />
                    <div className="flex justify-between px-2">
                        <p className="text-[11px] font-bold text-slate-300">
                            SSE(Server-Sent Events)를 통해 실시간으로 전달됩니다.
                        </p>
                        <span className={`text-[11px] font-black ${message.length > 450 ? 'text-red-400' : 'text-slate-300'}`}>
                            {message.length}/500
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={handleBroadcast}
                        disabled={isSending || !message.trim()}
                        className="flex-1 py-5 bg-blue-600 text-white rounded-[28px] font-black text-[15px] hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isSending ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                발송 중...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                전체 발송
                            </>
                        )}
                    </button>
                </div>

                {sentCount > 0 && (
                    <div className="flex items-center gap-3 p-6 bg-teal-50 rounded-3xl animate-in fade-in">
                        <CheckCircle2 className="text-teal-600" size={20} />
                        <p className="text-[13px] font-bold text-teal-700">
                            이번 세션에서 총 <span className="font-black">{sentCount}건</span>의 공지가 발송되었습니다.
                        </p>
                    </div>
                )}
            </section>

            <div className="bg-slate-50 rounded-[40px] p-10 space-y-6">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">발송 안내</h3>
                <ul className="space-y-3 text-[13px] font-bold text-slate-500">
                    <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5">•</span>
                        공지는 현재 사이트에 접속 중인(SSE 연결 상태) 사용자에게만 전달됩니다.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5">•</span>
                        알림은 상단 헤더의 🔔 알림 패널에 실시간으로 표시됩니다.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="text-blue-500 mt-0.5">•</span>
                        알림 수신을 꺼둔 사용자에게도 공지는 전달됩니다 (전체 브로드캐스트).
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AdminBroadcast;
