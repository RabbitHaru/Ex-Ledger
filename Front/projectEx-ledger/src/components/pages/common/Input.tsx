import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

/**
 * 공통 입력 폼 컴포넌트
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, id, ...props }, ref) => {
        const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        return (
            <div className="flex flex-col space-y-1.5 w-full">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={`flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500 focus:ring-red-500' : ''
                        } ${className}`}
                    {...props}
                />
                {error && <span className="text-sm text-red-500">{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
