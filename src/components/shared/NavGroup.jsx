import React from "react";
import {
  ChevronDown
} from "lucide-react";

export default function NavGroup({ section, open, onToggle, active, onSelect }) {
  const Icon = section.icon;
  const isActive = active === section.key;

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
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#5B5F73] hover:bg-[#F7F8FB] transition-colors"
      >
        <Icon size={18} strokeWidth={2} />
        <span className="flex-1 text-left">{section.label}</span>
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
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
