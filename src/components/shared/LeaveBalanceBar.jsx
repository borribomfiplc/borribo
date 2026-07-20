import React from "react";

export default function LeaveBalanceBar({ used, quota, color }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-[#EBEDF3] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
