import React from "react";
import {
  Download
} from "lucide-react";
import { COLORS } from "../../data/theme";

export default function ReportHeader({ title, sub }) {
  const downloadReport = () => window.print();
  return (
    <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">{title}</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">{sub}</p>
      </div>
      <button onClick={downloadReport} className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap" style={{ background: COLORS.primary }}>
        <Download size={16} />
        ទាញយករបាយការណ៍
      </button>
    </div>
  );
}
