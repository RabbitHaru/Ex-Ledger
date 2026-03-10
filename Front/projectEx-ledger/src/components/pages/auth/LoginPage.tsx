import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { OtpInput } from "../common/OtpInput";
import http from "../../../config/http";
import { setToken, setRefreshToken } from "../../../config/auth";
import { Turnstile } from "@marsidev/react-turnstile";

const LoginPage: React.FC = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("Turnstile (봇 방지) 인증이 완료되지 않았습니다.");
      return;
    }

    try {
      // 이제 백엔드에서 MFA 검증 없이 즉시 토큰을 반환함
      const response = await http.post('/auth/login', { email, password, turnstileToken });
      if (response.data && response.data.data) {
        const { accessToken, refreshToken } = response.data.data;
        setToken(accessToken);
        if (refreshToken) setRefreshToken(refreshToken);

        // 로그인 성공 시 메인으로 이동 (권한에 따른 메인 페이지는 Sidebar/AppRoutes에서 처리됨)
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.data || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-12">
      <header className="text-center mb-12">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic">로그인</h2>
        <p className="text-slate-400 font-bold text-[12px] uppercase tracking-[0.2em] mt-3">Ex-Ledger 서비스에 접속합니다</p>
      </header>

      {error && (
        <div className="px-5 py-4 mb-6 text-[13px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <Input
            label="이메일"
            type="email"
            placeholder="example@exledger.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-center my-8">
          <Turnstile
            siteKey="1x00000000000000000000AA"
            onSuccess={(token) => setTurnstileToken(token)}
          />
        </div>

        <Button type="submit" className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[24px] font-black text-[16px] transition-all shadow-xl shadow-slate-200 active:scale-[0.98]">
          들어가기
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
