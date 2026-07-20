import React from "react";

export default function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor, chartColor }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: iconBg }}
          >
            <Icon size={20} color={iconColor} strokeWidth={2} />
          </div>
          <span className="text-sm text-[#8A8FA3]">{label}</span>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-[#1E2333] leading-none">{value}</div>
          <div className="text-xs text-[#8A8FA3] mt-1.5">{sub}</div>
        </div>
        <svg width="70" height="26" viewBox="0 0 70 26" fill="none">
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
