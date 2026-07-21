import React from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { COLORS } from "../data/theme";

export default function AccessDeniedPage({ onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F6FA]" style={{ fontFamily: "'Noto Sans Khmer','Inter',sans-serif" }}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#EBEDF3] p-7 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[#FBEBE8] text-[#D9614F]">
          <ShieldAlert size={28} />
        </div>
        <h1 className="font-bold text-lg text-[#1E2333]">គណនីនេះមិនទាន់មានសិទ្ធិប្រើប្រាស់</h1>
        <p className="text-sm text-[#8A8FA3] leading-relaxed mt-2">
          សូមឲ្យអ្នកគ្រប់គ្រងបង្កើត Profile និងកំណត់តួនាទីសម្រាប់គណនីនេះជាមុនសិន។
        </p>
        <button onClick={onLogout} className="mt-6 w-full rounded-xl py-3 text-white text-sm font-semibold flex justify-center items-center gap-2" style={{ background: COLORS.primary }}>
          <LogOut size={16} /> ចាកចេញ
        </button>
      </div>
    </div>
  );
}
