import React, { useRef } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
    value: string;
    onChange: (val: string) => void;
    onComplete?: (val: string) => void;
    length?: number;
    disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
    value,
    onChange,
    onComplete,
    length = 6,
    disabled = false,
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const text = e.target.value.replace(/[^0-9]/g, '');
        if (!text) return;

        if (text.length > 1) {
            const newOtp = text.slice(0, length);
            onChange(newOtp);
            if (newOtp.length === length && onComplete) {
                onComplete(newOtp);
            }
            return;
        }

        const newOtp = value.substring(0, index) + text.slice(-1) + value.substring(index + 1);
        const finalOtp = newOtp.slice(0, length);
        onChange(finalOtp);

        if (index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (finalOtp.length === length && onComplete) {
            onComplete(finalOtp);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            if (!value[index] && index > 0) {
                const newOtp = value.substring(0, index - 1) + value.substring(index);
                onChange(newOtp);
                inputRefs.current[index - 1]?.focus();
            } else {
                const newOtp = value.substring(0, index) + value.substring(index + 1);
                onChange(newOtp);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }, (_, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={length}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    disabled={disabled}
                    autoComplete="one-time-code"
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 text-slate-800"
                />
            ))}
        </div>
    );
};
