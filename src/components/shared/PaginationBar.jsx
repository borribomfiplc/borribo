import React from "react";
import {
  ChevronRight, ChevronLeft
} from "lucide-react";

export default function PaginationBar({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems === 0) return null;
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-1 pt-4">
      <div className="text-xs text-[#8A8FA3]">
        បង្ហាញ {startItem}–{endItem} នៃ {totalItems} កំណត់ត្រា
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="ទំព័រមុន"
          className="w-8 h-8 rounded-lg border border-[#EBEDF3] flex items-center justify-center text-[#5B5F73] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F6FA] shrink-0"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-[#5B5F73] font-medium px-2 whitespace-nowrap">
          ទំព័រ {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="ទំព័របន្ទាប់"
          className="w-8 h-8 rounded-lg border border-[#EBEDF3] flex items-center justify-center text-[#5B5F73] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F5F6FA] shrink-0"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
