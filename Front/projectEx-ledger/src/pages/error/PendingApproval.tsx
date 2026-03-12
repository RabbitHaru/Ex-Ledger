import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Hourglass, Search, FileCheck, LogOut, UserCircle } from 'lucide-react';
import { logout } from '../../config/auth';

const PendingApproval: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-40" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        {/* 아이콘 및 애니메이션 */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-40 h-40 bg-slate-900 rounded-[56px] flex items-center justify-center shadow-2xl">
                <Search size={80} className="text-white animate-pulse" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl scale-in duration-700">
                <Hourglass size={40} className="animate-spin-slow" />
              </div>
            </div>
          </div>
          <p className="text-slate-400 font-black text-sm uppercase tracking-[0.4em] mt-8">Reviewing your application</p>
        </div>

        {/* 메시지 영역 */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">승인 완료 후 이용 가능합니다.</h2>
          <p className="text-slate-500 font-bold text-lg leading-relaxed max-w-lg mx-auto">
            현재 회원님의 가입 및 기업 정보에 대해 저희 운영팀에서 <br />
            진위 여부를 꼼꼼하게 심사하고 있습니다.
          </p>
          <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 flex flex-col items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
                <FileCheck size={24} />
             </div>
             <p className="text-slate-600 font-bold">심사는 영업일 기준 보통 1~2일이 소요됩니다. <br /> 완료되면 이메일로 즉시 안내해 드리겠습니다.</p>
          </div>
        </div>

        {/* 하단 버튼 및 액션 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400">
          <button
            onClick={() => navigate('/')}
            className="group px-8 py-4 border-2 border-slate-100 rounded-[32px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3 active:scale-95"
          >
            <Home size={20} />
            메인 페이지로
          </button>

          <button
            onClick={() => navigate('/mypage')}
            className="group px-8 py-4 border-2 border-slate-100 rounded-[32px] font-black text-slate-800 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3 active:scale-95"
          >
            <UserCircle size={20} />
            마이 페이지
          </button>
          
          <button
            onClick={handleLogout}
            className="group px-8 py-4 bg-slate-900 text-white rounded-[32px] font-black hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-3 active:scale-95"
          >
            <LogOut size={20} />
            로그아웃 하기
          </button>
        </div>

        {/* 푸터 정보 */}
        <div className="pt-12 text-slate-300 font-bold text-sm tracking-widest uppercase animate-in fade-in duration-1000 delay-700">
          Ex-Ledger. Safety first for your business.
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
