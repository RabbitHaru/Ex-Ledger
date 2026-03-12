import React from "react";
import { CheckCircle2, Download, Share2, X, Printer } from "lucide-react";

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    txId: string;
    sender: string;
    recipient: string;
    recipientAcc: string;
    amount: number;
    fee: number;
    total: number;
    date: string;
    category: "PERSONAL" | "BUSINESS";
  };
}

const ReceiptModal: React.FC<ReceiptProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className={`p-8 text-center ${data.category === "BUSINESS" ? "bg-blue-600" : "bg-teal-600"} text-white`}>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-full"><CheckCircle2 size={32} /></div>
          </div>
          <h3 className="text-xl italic font-black uppercase tracking-tighter">Transaction Complete</h3>
          <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{data.txId}</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-1 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Sent</p>
            <p className="text-4xl italic font-black text-slate-900 tracking-tighter">
              {data.amount.toLocaleString()} <span className="text-sm not-italic opacity-30">KRW</span>
            </p>
          </div>

          <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Sender</span>
              <span className="text-slate-900">{data.sender}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Recipient</span>
              <span className="text-slate-900">{data.recipient}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Account</span>
              <span className="text-slate-900 font-mono tracking-tighter">{data.recipientAcc}</span>
            </div>
            <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] font-bold">
              <span className="text-slate-400 uppercase">Service Fee</span>
              <span className="text-red-500">+{data.fee.toLocaleString()} KRW</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;