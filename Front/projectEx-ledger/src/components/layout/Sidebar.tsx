import { Link } from "react-router-dom";
import { LayoutDashboard, Home, Calculator, Globe, X } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-2xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between p-8">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-blue-600">
            EX-LEDGER
          </h1>
          <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">
            Cross-border System
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 transition-colors rounded-lg hover:bg-gray-50"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 group"
        >
          <Home
            size={18}
            className="text-slate-400 group-hover:text-blue-500"
          />
          홈
        </Link>

        <div className="px-4 pt-6 pb-2">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
            Management
          </p>
        </div>

        <Link
          to="/settlement"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 group"
        >
          <Calculator
            size={18}
            className="text-slate-400 group-hover:text-blue-500"
          />
          정산
        </Link>

        <Link
          to="/finance"
          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 group"
        >
          <Globe
            size={18}
            className="text-slate-400 group-hover:text-blue-500"
          />
          환율
        </Link>

        <Link
          to="/seller/dashboard"
          className="flex items-center gap-3 px-4 py-3 mt-4 text-sm font-bold text-blue-600 transition-all border border-blue-100 rounded-xl bg-blue-50"
        >
          <LayoutDashboard size={18} />
          셀러 대시보드
        </Link>
      </nav>

      <div className="p-6 mt-auto border-t border-gray-50">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
          <div className="flex items-center justify-center font-bold text-white bg-blue-600 rounded-full shadow-md w-9 h-9 shadow-blue-100">
            C
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Member C</p>
            <p className="text-[10px] text-gray-400 font-medium">
              Seller Service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
