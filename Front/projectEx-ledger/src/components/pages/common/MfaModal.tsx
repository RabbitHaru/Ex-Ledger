import React, { useState } from 'react';
import Modal from './Modal';
import { OtpInput } from './OtpInput';
import { Button } from './Button';
import { ShieldAlert } from 'lucide-react';

interface MfaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (code: string) => void;
    isLoading?: boolean;
    error?: string;
}

const MfaModal: React.FC<MfaModalProps> = ({ isOpen, onClose, onVerify, isLoading, error }) => {
    const [code, setCode] = useState("");

    const handleVerify = () => {
        if (code.length === 6) {
            onVerify(code);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="보안 인증 필요">
            <div className="space-y-6 text-center py-4">
                <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                    <ShieldAlert size={32} />
                </div>
                
                <div className="space-y-2">
                    <p className="font-black text-slate-800 text-lg italic">OTP 인증번호 입력</p>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                        금융 거래 승인을 위해 구글 OTP 앱의<br />6자리 번호를 입력해주세요.
                    </p>
                </div>

                <div className="flex justify-center py-4">
                    <OtpInput value={code} onChange={setCode} onComplete={onVerify} />
                </div>

                {error && (
                    <p className="text-red-500 text-[12px] font-bold">{error}</p>
                )}

                <div className="flex gap-4 pt-2">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        취소
                    </button>
                    <Button 
                        onClick={handleVerify}
                        disabled={code.length !== 6 || isLoading}
                        className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[14px] shadow-xl active:scale-95 transition-all"
                    >
                        {isLoading ? "인증 중..." : "거래 승인"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default MfaModal;
