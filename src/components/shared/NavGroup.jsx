import React from "react";
import {
  ChevronDown,
  CalendarRange,
  ClipboardList,
  FileBarChart2,
  ArrowUpRight,
} from "lucide-react";

const REPORT_ITEM_META = {
  "របាយការណ៍វត្តមាន": {
    icon: FileBarChart2,
    description: "វត្តមាន មកយឺត និងអវត្តមាន",
  },
  "របាយការណ៍ច្បាប់": {
    icon: ClipboardList,
    description: "សំណើ និងសមតុល្យច្បាប់ឈប់សម្រាក",
  },
  "របាយការណ៍ប្រចាំខែ": {
    icon: CalendarRange,
    description: "សង្ខេបទិន្នន័យតាមខែ",
  },
};

export default function NavGroup({ section, open, onToggle, active, onSelect }) {
  const Icon = section.icon;
  const isActive = active === section.key;
  const isReports = section.key === "reports";
  const hasActiveChild = section.items?.includes(active);

  if (section.single) {
    return (
      <button
        onClick={() => onSelect(section.key)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive
            ? "bg-[#EEF1FB] text-[#2A3F8F]"
            : "text-[#5B5F73] hover:bg-[#F7F8FB]"
        }`}
      >
        <Icon size={18} strokeWidth={2} />
        <span>{section.label}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => onToggle(section.key)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          hasActiveChild
            ? "bg-[#F4F6FC] text-[#2A3F8F]"
            : "text-[#5B5F73] hover:bg-[#F7F8FB]"
        }`}
      >
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasActiveChild ? "bg-white shadow-sm" : ""}`}>
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          size={15}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && isReports && (
        <div className="mt-2 ml-2 space-y-1.5 rounded-2xl border border-[#E8EBF3] bg-[#F8F9FC] p-2 shadow-[0_8px_24px_rgba(30,35,51,0.04)]">
          {section.items.map((item) => {
            const meta = REPORT_ITEM_META[item];
            const ItemIcon = meta?.icon || FileBarChart2;
            const selected = active === item;
            return (
              <button
                key={item}
                onClick={() => onSelect(item)}
                className={`group w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-all ${
                  selected
                    ? "bg-white text-[#2A3F8F] shadow-sm ring-1 ring-[#DCE3F7]"
                    : "text-[#5B5F73] hover:bg-white hover:shadow-sm"
                }`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-[#EEF1FB] text-[#2A3F8F]" : "bg-white text-[#8A8FA3] border border-[#EBEDF3]"}`}>
                  <ItemIcon size={17} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-5">{item}</span>
                  <span className="block text-[10px] leading-4 text-[#9A9EAE] truncate">{meta?.description}</span>
                </span>
                <ArrowUpRight size={14} className={`shrink-0 transition-all ${selected ? "text-[#2A3F8F]" : "text-[#C0C3CF] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"}`} />
              </button>
            );
          })}
        </div>
      )}

      {open && !isReports && (
        <div className="mt-1 ml-[1.9rem] pl-3 border-l border-[#EBEDF3] flex flex-col gap-0.5">
          {section.items.map((item) => (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                active === item
                  ? "text-[#2A3F8F] font-medium bg-[#EEF1FB]"
                  : "text-[#8A8FA3] hover:text-[#1E2333] hover:bg-[#F7F8FB]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
