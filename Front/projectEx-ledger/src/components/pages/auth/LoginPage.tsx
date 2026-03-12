import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { OtpInput } from "../common/OtpInput";
import http from "../../../config/http";
import { setToken, setRefreshToken } from "../../../config/auth";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { PasswordStrength } from "../common/PasswordStrength";
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = React.useRef<TurnstileInstance>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Turnstile (봇 방지) 인증이 완료되지 않았습니다.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await http.post('/auth/login', { email, password, turnstileToken });
      if (response.data && response.data.data) {
        const { accessToken, refreshToken } = response.data.data;
        
        setToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);
        window.location.href = "/";
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.data || '로그인에 실패했습니다.';
      setError(msg);
      toast.error(msg);
      // Reset Turnstile on failure
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-12">
      <header className="text-center mb-12">
        <h2 className="text-5xl font-black text-slate-900 tracking-tight italic">로그인</h2>
        <p className="text-slate-400 font-bold text-[14px] uppercase tracking-[0.2em] mt-3">Ex-Ledger 서비스에 접속합니다</p>
      </header>

      {error && (
        <div className="px-6 py-5 mb-8 text-[14px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-[28px] animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-5 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative">
          <Input
            label="이메일"
            type="email"
            placeholder="example@exledger.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div>
            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordStrength password={password} />
          </div>
        </div>

        <div className="flex justify-center my-8">
          <Turnstile
            ref={turnstileRef}
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
            onSuccess={(token) => setTurnstileToken(token)}
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading || !turnstileToken}
          className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] font-black text-[16px] transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "확인 중..." : "들어가기"}
        </Button>
      </form>

      <div className="mt-12 text-[14px] font-bold text-center text-slate-400">
        아직 회원이 아니신가요?{" "}
        <Link to="/signup" className="text-teal-600 hover:underline transition-all ml-1">
          회원가입 하기
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
