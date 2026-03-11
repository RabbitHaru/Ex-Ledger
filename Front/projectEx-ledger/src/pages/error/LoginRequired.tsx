import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, Home, LockKeyhole } from 'lucide-react';

const LoginRequired: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-50 rounded-full blur-[120px] opacity-30" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        {/* 아이콘 및 애니메이션 */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-40 h-40 bg-slate-900 rounded-[56px] rotate-3 flex items-center justify-center shadow-2xl">
                <LockKeyhole size={80} className="text-white -rotate-3" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-teal-600 rounded-3xl flex items-center justify-center text-white shadow-xl animate-bounce-subtle">
                <LogIn size={36} />
              </div>
            </div>
          </div>
          <p className="text-slate-400 font-black text-sm uppercase tracking-[0.4em] mt-8">Secure Area</p>
        </div>

        {/* 메시지 영역 */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">로그인이 필요한 서비스입니다.</h2>
          <p className="text-slate-500 font-bold text-lg leading-relaxed max-w-lg mx-auto">
            요청하신 페이지는 회원 전용 공간입니다. <br />
            보안과 개인정보 보호를 위해 먼저 로그인을 해주세요.
          </p>
        </div>

        {/* 하단 버튼 및 액션 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400">
          <button
            onClick={() => navigate('/login', { state: { from: (location.state as any)?.from }, replace: true })}
            className="group px-10 py-5 bg-slate-900 text-white rounded-[32px] font-black hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-3 active:scale-95"
          >
            <LogIn size={20} />
            로그인하러 가기
          </button>
          
          <button
            onClick={() => navigate('/signup')}
            className="group px-10 py-5 border-2 border-slate-100 rounded-[32px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3 active:scale-95"
          >
            <UserPlus size={20} />
            신규 회원가입
          </button>
        </div>

        <button
            onClick={() => navigate('/')}
            className="text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center gap-2 mx-auto animate-in fade-in duration-1000 delay-700"
        >
            <Home size={16} />
            메인 페이지로 돌아가기
        </button>

        {/* 푸터 정보 */}
        <div className="pt-8 text-slate-200 font-bold text-xs tracking-widest uppercase select-none">
          Ex-Ledger. Global Secure Settlement Infrastructure.
        </div>
      </div>
    </div>
  );
};

export default LoginRequired;
