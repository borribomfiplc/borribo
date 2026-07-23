import React from "react";

export default function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, chartColor }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-[#EBEDF3] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:gap-3 sm:p-5">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11"
          style={{ background: iconBg }}
        >
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </div>
        <span className="min-w-0 text-[11px] leading-tight text-[#8A8FA3] sm:text-sm">{label}</span>
      </div>
      <div className="flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="break-words text-xl font-bold leading-none text-[#1E2333] sm:text-2xl">{value}</div>
          <div className="mt-1.5 text-[10px] leading-tight text-[#8A8FA3] sm:text-xs">{sub}</div>
        </div>
        <svg className="hidden shrink-0 min-[430px]:block" width="54" height="24" viewBox="0 0 70 26" fill="none" aria-hidden="true">
          <path
            d="M0 18 L10 14 L20 20 L30 8 L40 12 L50 4 L60 10 L70 2"
            stroke={chartColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
