import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { OtpInput } from "../common/OtpInput";
import http from "../../../config/http";
import { setToken } from "../../../config/auth";
import { Turnstile } from "@marsidev/react-turnstile";

const LoginPage: React.FC = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent, mfaCodeArg?: string) => {
    e.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("Turnstile (봇 방지) 인증이 완료되지 않았습니다.");
      return;
    }

    try {
      if (isMfaRequired) {
        // MFA 검증 로직
        const codeNum = mfaCodeArg ? Number(mfaCodeArg) : Number(otpCode);
        const response = await http.post('/auth/login/mfa', { email, password, code: codeNum, turnstileToken });
        if (response.data && response.data.data) {
          const { accessToken } = response.data.data;
          setToken(accessToken);
          window.location.href = '/';
        }
      } else {
        // 1차 로그인 라우트
        const response = await http.post('/auth/login', { email, password, turnstileToken });
        if (response.data && response.data.data) {
          const { accessToken, mfaRequired, mfaSetupRequired } = response.data.data;

          if (mfaSetupRequired) {
            setError('보안 강화를 위해 구글 OTP 최초 설정이 필요합니다. 설정 페이지로 이동합니다.');
            setTimeout(() => {
              navigate('/auth/mfa', { state: { email } });
            }, 1500);
            return;
          }

          if (mfaRequired) {
            setIsMfaRequired(true);
            setError(''); // 이전 에러 초기화
          } else {
            setToken(accessToken);
            window.location.href = '/';
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.data || '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
        로그인
      </h2>

      {error && (
        <div className="px-4 py-3 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isMfaRequired}
        />

        {isMfaRequired && (
          <div className="space-y-4">
            <div className="text-center text-sm font-bold text-gray-700">구글 OTP 앱 6자리 코드</div>
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(code) => {
                // e.preventDefault doesn't exist here, but we can pass code directly
                handleLogin({ preventDefault: () => { } } as any, code);
              }}
            />
          </div>
        )}

        <div className="flex justify-center my-4">
          <Turnstile
            siteKey="1x00000000000000000000AA"
            onSuccess={(token) => setTurnstileToken(token)}
          />
        </div>

        <Button type="submit" className="w-full mt-4">
          로그인
        </Button>
      </form>

      <div className="mt-6 text-sm text-center text-gray-600">
        계정이 없으신가요?{" "}
        <Link to="/signup" className="text-blue-600 hover:text-blue-800">
          회원가입
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
