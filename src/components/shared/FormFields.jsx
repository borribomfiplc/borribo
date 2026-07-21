// Small shared form building blocks used across the Add Employee and other forms.

import React from "react";
import {
  ChevronDown
} from "lucide-react";

export function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-medium text-[#5B5F73] mb-1.5">
      {children} {required && <span className="text-[#D9614F]">*</span>}
    </label>
  );
}

export function TextField({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />}
      <input
        {...props}
        className={`w-full bg-[#F5F6FA] rounded-xl px-4 ${Icon ? "pr-10" : ""} py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 border border-transparent focus:border-[#2A3F8F]/20`}
      />
    </div>
  );
}

export function SelectField({ options, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="appearance-none w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
      >
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          return (
          <option key={value} value={value}>
            {label}
          </option>
          );
        })}
      </select>
      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
    </div>
  );
}

export function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
      <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4 flex items-center gap-2">
        <Icon size={16} className="text-[#2A3F8F]" />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
