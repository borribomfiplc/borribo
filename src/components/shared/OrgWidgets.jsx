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
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
          style={{ background: COLORS.primary }}
        >
          <UserPlus size={16} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function OrgModal({ title, onClose, onSubmit, submitLabel, error, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-5 flex items-center justify-between border-b border-[#EBEDF3] bg-white px-4 py-4 sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:p-0">
          <h3 className="font-bold text-[#1E2333] text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
            <X size={18} />
          </button>
        </div>
        {error && <div className="text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2 mb-3.5">{error}</div>}
        <div className="flex flex-col gap-3.5">{children}</div>
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-6 grid grid-cols-2 gap-3 border-t border-[#EBEDF3] bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mb-0 sm:flex sm:border-0 sm:p-0">
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
