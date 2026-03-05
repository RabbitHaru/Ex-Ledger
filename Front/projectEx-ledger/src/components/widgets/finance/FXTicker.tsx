import React from "react";
import { formatCurrency } from "../../../utils/formatter";
import type { ExchangeRate } from "../../../types/exchange";

interface FXTickerProps {
  rates: ExchangeRate[];
}

const FXTicker: React.FC<FXTickerProps> = ({ rates }) => {
  if (!rates || !Array.isArray(rates) || rates.length === 0) {
    return (
      <div className="w-full h-10 border-b bg-slate-900 border-slate-800" />
    );
  }

  const displayRates = rates;

  const duplicatedRates = [...displayRates, ...displayRates];

  return (
    <div className="relative flex items-center w-full h-10 overflow-hidden border-b shadow-inner bg-slate-900 border-slate-800">
      <style>
        {`
          @keyframes ticker-slide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-track {
            display: flex;
            width: max-content;
            animation: ticker-slide 60s linear infinite; 
          }
          .ticker-track:hover { animation-play-state: paused; }
        `}
      </style>

      <div className="ticker-track">
        {duplicatedRates.map((rate, index) => {
          const amount = rate.changeAmount || 0;
          const isUp = amount > 0;
          const isDown = amount < 0;

          const colorClass = isUp
            ? "text-red-400"
            : isDown
              ? "text-blue-400"
              : "text-slate-400";
          const arrow = isUp ? "▲" : isDown ? "▼" : "-";

          return (
            <div
              key={`${rate.curUnit}-${index}`}
              className="flex items-center px-10 border-r whitespace-nowrap border-slate-800"
            >
              <span className="mr-3 text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                {rate.curUnit}
              </span>

              <span className="mr-3 font-mono text-sm font-bold text-slate-100">
                {formatCurrency(rate.rate, rate.curUnit)}
              </span>

              <span
                className={`flex items-center text-[11px] font-bold ${colorClass}`}
              >
                {arrow} {Math.abs(amount).toFixed(2)}
                <span className="ml-1 opacity-80">
                  ({Math.abs(rate.changeRate || 0).toFixed(2)}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FXTicker;
