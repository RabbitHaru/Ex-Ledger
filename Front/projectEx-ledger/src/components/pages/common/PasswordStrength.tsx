import React from 'react';

interface PasswordStrengthProps {
    password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
    const calculateStrength = (pwd: string) => {
        let score = 0;
        if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };

        if (pwd.length >= 8) score += 1;
        if (/[a-z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500', text: '보안 낮음' };
        if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-500', text: '보안 보통' };
        return { score, label: 'Strong', color: 'bg-teal-500', text: '보안 강력' };
    };

    const strength = calculateStrength(password);

    const requirements = [
        { label: '8자 이상', met: password.length >= 8 },
        { label: '소문자 포함', met: /[a-z]/.test(password) },
        { label: '숫자 포함', met: /[0-9]/.test(password) },
        { label: '특수문자 포함', met: /[^A-Za-z0-9]/.test(password) },
    ];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Password Security</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${strength.color}`}>
                    {strength.text}
                </span>
            </div>
            
            <div className="flex gap-1 h-1">
                {[1, 2, 3, 4].map((s) => (
                    <div 
                        key={s} 
                        className={`flex-1 rounded-full transition-all duration-500 ${s <= strength.score ? strength.color : 'bg-slate-100'}`}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${req.met ? 'bg-teal-500' : 'bg-slate-300'}`} />
                        <span className={`text-[10px] font-bold ${req.met ? 'text-teal-600' : 'text-slate-400'}`}>
                            {req.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
