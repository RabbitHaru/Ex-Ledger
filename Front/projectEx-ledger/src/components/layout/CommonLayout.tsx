import React, { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

const CommonLayout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const token = localStorage.getItem("access_token");

  return (
    <div className="flex min-h-screen font-sans bg-gray-50 text-slate-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 bg-slate-900/20 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* 상단 내비게이션 바 (Header) */}
        <header className="sticky top-0 z-30 w-full px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between mx-auto max-w-7xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 transition-all text-slate-600 hover:bg-gray-100 rounded-xl"
                aria-label="메뉴 열기"
              >
                <Menu size={24} />
              </button>

              <Link to="/" className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded shadow-lg shadow-teal-100">
                  <span className="text-xl font-bold text-white">E</span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tighter text-slate-800">
                  Ex-Ledger
                </h1>
              </Link>
            </div>

            {/* 중앙 메뉴 (Desktop) */}
            <nav className="items-center hidden gap-8 text-sm font-semibold md:flex text-slate-600">
              <a href="#" className="transition-colors hover:text-teal-600">
                서비스 소개
              </a>
              <a href="#" className="transition-colors hover:text-teal-600">
                환율 정보
              </a>
              <a href="#" className="transition-colors hover:text-teal-600">
                고객 지원
              </a>
            </nav>

            {/* 우측 버튼 (인증 상태 연동) */}
            <div>
              {token ? (
                <button
                  onClick={() => {
                    localStorage.removeItem("access_token");
                    window.location.href = "/";
                  }}
                  className="px-5 py-2 text-sm font-bold text-white transition-all rounded-md shadow-sm bg-slate-600 hover:bg-slate-700"
                >
                  로그아웃
                </button>
              ) : (
                <Link to="/login">
                  <button className="px-5 py-2 text-sm font-bold text-white transition-all bg-teal-700 rounded-md shadow-sm hover:bg-teal-800">
                    로그인/회원가입
                  </button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-grow">{children}</main>

        {/* 푸터 영역 (Footer) */}
        <footer className="px-6 py-12 bg-slate-900 text-slate-400">
          <div className="flex flex-col items-center gap-6 mx-auto max-w-7xl">
            {/* 인증 마크 로고 섹션 */}
            <div className="flex gap-6 opacity-50 grayscale">
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                ISO 27001
              </span>
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                PCI-DSS
              </span>
              <span className="px-2 py-1 text-xs border rounded border-slate-700">
                ISMS
              </span>
            </div>

            <div className="space-y-2 text-center">
              <div className="flex justify-center gap-4 mb-4 text-xs font-medium">
                <a href="#" className="hover:text-white">
                  이용약관
                </a>
                <a href="#" className="font-bold hover:text-white">
                  개인정보처리방침
                </a>
                <a href="#" className="hover:text-white">
                  운영정책
                </a>
                <a href="#" className="hover:text-white">
                  공지사항
                </a>
              </div>
              <p className="text-xs">
                Ex-Ledger Co., Ltd. | 대표이사: 홍길동 | 사업자등록번호:
                000-00-00000
              </p>
              <p className="text-[10px] text-slate-600">
                © 2026 Ex-Ledger. All rights reserved. 안전하고 투명한 글로벌
                정산 서비스를 제공합니다.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CommonLayout;
