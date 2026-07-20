import React from "react";
import {
  Save
} from "lucide-react";
import { COLORS } from "../../data/theme";

export function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <div className="text-sm font-medium text-[#1E2333]">{label}</div>
        {desc && <div className="text-xs text-[#8A8FA3] mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
        style={{ background: checked ? COLORS.primary : "#EBEDF3" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "22px" : "2px" }}
        />
      </button>
    </div>
  );
}

export function SettingsSaveBar({ onSave, saved }) {
  return (
    <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
      {saved ? (
        <span className="text-sm text-[#3FA66B] bg-[#E9F7EF] rounded-xl px-4 py-2.5">បានរក្សាទុកការកំណត់ដោយជោគជ័យ!</span>
      ) : (
        <span />
      )}
      <button
        onClick={onSave}
        className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap ml-auto"
        style={{ background: COLORS.primary }}
      >
        <Save size={16} />
        រក្សាទុក
      </button>
    </div>
  );
}
