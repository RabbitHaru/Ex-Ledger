import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 장식 요소 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[120px] opacity-40" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
        {/* 아이콘 및 404 텍스트 */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-40 h-40 bg-slate-900 rounded-[56px] rotate-12 flex items-center justify-center shadow-2xl">
                <Search size={80} className="text-white -rotate-12" />
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-xl animate-bounce">
                <AlertCircle size={40} />
              </div>
            </div>
          </div>
          <h1 className="text-[140px] font-black text-slate-100 leading-none tracking-tighter select-none">404</h1>
        </div>

        {/* 메시지 영역 */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">길을 잃으신 것 같아요.</h2>
          <p className="text-slate-500 font-bold text-lg leading-relaxed max-w-lg mx-auto">
            요청하신 페이지가 삭제되었거나, 주소가 변경되었을 수 있습니다. <br />
            입력하신 주소가 정확한지 다시 한번 확인해 주세요.
          </p>
        </div>

        {/* 하단 버튼 및 액션 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400">
          <button
            onClick={() => navigate(-1)}
            className="group px-10 py-5 border-2 border-slate-100 rounded-[32px] font-black text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3 active:scale-95"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            이전 페이지로
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="group px-10 py-5 bg-slate-900 text-white rounded-[32px] font-black hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-3 active:scale-95"
          >
            <Home size={20} />
            메인으로 돌아가기
          </button>
        </div>

        {/* 푸터 정보 */}
        <div className="pt-12 text-slate-300 font-bold text-sm tracking-widest uppercase animate-in fade-in duration-1000 delay-700">
          © 2026 Ex-Ledger Team. Efficiency at its best.
        </div>
      </div>
    </div>
  );
};

export default NotFound;
