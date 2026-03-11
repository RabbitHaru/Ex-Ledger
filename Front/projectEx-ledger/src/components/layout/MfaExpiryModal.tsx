import React from 'react';
import { AlertTriangle, LogIn, X } from 'lucide-react';

interface MfaExpiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

export const MfaExpiryModal: React.FC<MfaExpiryModalProps> = ({ isOpen, onClose, onLogin }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
            {/* Backdrop - Click disabled to prevent accidental closure */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 p-8 flex flex-col items-center text-center animate-in zoom-in slide-in-from-bottom-8 duration-500">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-amber-200/20 blur-xl rounded-full animate-pulse" />
                    <AlertTriangle className="text-amber-500 relative" size={40} strokeWidth={2.5} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
                    보안 세션 만료
                </h2>
                
                <p className="text-slate-500 text-[14px] font-medium leading-relaxed mb-8">
                    안전한 자금 관리를 위해 MFA 보안 세션이 만료되었습니다.<br/>
                    계속 이용하시려면 다시 로그인해 주세요.
                </p>
                
                <div className="flex flex-col w-full gap-3">
                    <button
                        onClick={onLogin}
                        className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-[0.98] group"
                    >
                        <LogIn size={18} className="transition-transform group-hover:translate-x-1" />
                        다시 로그인하기
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-[0.98]"
                    >
                        창 닫기
                    </button>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
