import React from "react";
import {
  UserPlus, X
} from "lucide-react";
import { COLORS } from "../../data/theme";

export function OrgHeader({ title, sub, onAdd, addLabel }) {
  return (
    <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">{title}</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">{sub}</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
        style={{ background: COLORS.primary }}
      >
        <UserPlus size={16} />
        {addLabel}
      </button>
    </div>
  );
}

export function OrgModal({ title, onClose, onSubmit, submitLabel, error, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-[#1E2333] text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
            <X size={18} />
          </button>
        </div>
        {error && <div className="text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2 mb-3.5">{error}</div>}
        <div className="flex flex-col gap-3.5">{children}</div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#5B5F73]">
            បោះបង់
          </button>
          <button onClick={onSubmit} className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold" style={{ background: COLORS.primary }}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
