import React from "react";
import {
  Download, Printer
} from "lucide-react";
import { COLORS } from "../../data/theme";

export default function ReportHeader({ title, sub, onExportCsv, onPrint }) {
  return (
    <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">{title}</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">{sub}</p>
      </div>
      <div className="report-actions flex w-full gap-2 min-[420px]:w-auto">
        <button onClick={onExportCsv} disabled={!onExportCsv} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm" style={{ background: COLORS.primary }}>
          <Download size={16} /> CSV / Excel
        </button>
        <button onClick={onPrint} disabled={!onPrint} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#EBEDF3] bg-white px-3.5 py-2 text-xs font-semibold text-[#2A3F8F] disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm">
          <Printer size={16} /> PDF / Print
        </button>
      </div>
    </div>
  );
}
