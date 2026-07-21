import React, { useState } from "react";
import {
  Clock, Search, ChevronDown, FileText, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { attendanceStatusStyle } from "../data/mockData";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";
import StatCard from "../components/shared/StatCard";

export default function AttendanceHistoryPage({ historyData }) {
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ទាំងអស់");
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [fromDate, setFromDate] = useState("2026-07-15");
  const [toDate, setToDate] = useState("2026-07-19");

  const branches = ["ទាំងអស់", ...Array.from(new Set(historyData.map((a) => a.branch)))];
  const statuses = ["ទាំងអស់", "មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"];

  const filtered = historyData
    .filter((a) => {
      const matchesQuery = a.name.includes(query) || a.id.toLowerCase().includes(query.toLowerCase());
      const matchesBranch = branchFilter === "ទាំងអស់" || a.branch === branchFilter;
      const matchesStatus = statusFilter === "ទាំងអស់" || a.status === statusFilter;
      const matchesDate = a.dateISO >= fromDate && a.dateISO <= toDate;
      return matchesQuery && matchesBranch && matchesStatus && matchesDate;
    })
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);

  const counts = {
    present: filtered.filter((a) => a.status === "មានវត្តមាន").length,
    late: filtered.filter((a) => a.status === "យឺត").length,
    absent: filtered.filter((a) => a.status === "អវត្តមាន").length,
    leave: filtered.filter((a) => a.status === "ច្បាប់").length,
  };
  const attendanceRate = filtered.length
    ? (((counts.present + counts.late) / filtered.length) * 100).toFixed(0)
    : 0;
  const exportCsv = () => {
    const rows = [["Employee ID", "Name", "Branch", "Date", "Check-in", "Check-out", "Status"], ...filtered.map((a) => [a.id, a.name, a.branch, a.dateISO, a.checkIn, a.checkOut, a.status])];
    const csv = "\ufeff" + rows.map((row) => row.map((v) => `\"${String(v ?? "").replaceAll("\"", "\"\"")}\"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "attendance-history.csv"; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ប្រវត្តិវត្តមាន</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            មើលនិងស្វែងរកកំណត់ត្រាវត្តមានចាស់ៗរបស់បុគ្គលិកគ្រប់សាខា
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 border border-[#EBEDF3] rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-[#5B5F73] whitespace-nowrap"
        >
          <FileText size={16} />
          នាំចេញរបាយការណ៍
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard
          icon={CheckCircle2}
          label="មានវត្តមាន"
          value={counts.present}
          sub={`ក្នុងចន្លោះកាលបរិច្ឆេទដែលបានជ្រើស`}
          iconBg={COLORS.greenLight}
          iconColor={COLORS.green}
          chartColor={COLORS.green}
        />
        <StatCard
          icon={AlertCircle}
          label="មកយឺត"
          value={counts.late}
          sub={`ក្នុងចន្លោះកាលបរិច្ឆេទដែលបានជ្រើស`}
          iconBg={COLORS.amberLight}
          iconColor={COLORS.accent}
          chartColor={COLORS.accent}
        />
        <StatCard
          icon={XCircle}
          label="អវត្តមាន"
          value={counts.absent}
          sub={`ក្នុងចន្លោះកាលបរិច្ឆេទដែលបានជ្រើស`}
          iconBg={COLORS.redLight}
          iconColor={COLORS.red}
          chartColor={COLORS.red}
        />
        <StatCard
          icon={Clock}
          label="អត្រាវត្តមាន"
          value={`${attendanceRate}%`}
          sub={`ចំនួនកំណត់ត្រាសរុប ${filtered.length}`}
          iconBg={COLORS.purpleLight}
          iconColor={COLORS.purple}
          chartColor={COLORS.purple}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខសម្គាល់..."
              className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
            />
          </div>
          <div className="relative">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-52"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-44"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-[#8A8FA3] font-medium shrink-0">ចន្លោះកាលបរិច្ឆេទ៖</span>
          <input
            type="date"
            dir="ltr"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#F5F6FA] rounded-xl px-3.5 py-2 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
          />
          <span className="text-[#B4B7C6] text-xs">ដល់</span>
          <input
            type="date"
            dir="ltr"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#F5F6FA] rounded-xl px-3.5 py-2 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
              <th className="text-right font-medium px-5 py-3">កាលបរិច្ឆេទ</th>
              <th className="text-right font-medium px-5 py-3">សាខា / វេន</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចូល</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងចេញ</th>
              <th className="text-right font-medium px-5 py-3">ម៉ោងធ្វើការ</th>
              <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a, i) => {
              const st = attendanceStatusStyle[a.status];
              const StIcon = st.icon;
              return (
                <tr key={`${a.id}-${a.dateISO}-${i}`} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {a.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{a.name}</div>
                        <div className="text-xs text-[#B4B7C6]">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73] whitespace-nowrap">{a.date}</td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">
                    <div>{a.branch}</div>
                    <div className="text-xs text-[#B4B7C6]">វេន{a.shift}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkIn}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">
                    {a.checkOut}
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{a.hours}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1.5"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      <StIcon size={12} />
                      {a.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-[#8A8FA3] text-sm py-10">
                  រកមិនឃើញកំណត់ត្រាដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {paged.map((a, i) => {
          const st = attendanceStatusStyle[a.status];
          const StIcon = st.icon;
          return (
            <div key={`${a.id}-${a.dateISO}-${i}`} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {a.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{a.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">
                    {a.branch} · វេន{a.shift}
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium rounded-full px-2.5 py-1 inline-flex items-center gap-1 shrink-0"
                  style={{ background: st.bg, color: st.fg }}
                >
                  <StIcon size={11} />
                  {a.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3 mb-2">
                <span className="font-medium text-[#1E2333]">{a.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-[#8A8FA3]">
                <div>
                  <div className="text-[10px] mb-0.5">ចូល</div>
                  <div className="text-[#1E2333] font-medium" dir="ltr">
                    {a.checkIn}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mb-0.5">ចេញ</div>
                  <div className="text-[#1E2333] font-medium" dir="ltr">
                    {a.checkOut}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mb-0.5">សរុប</div>
                  <div className="text-[#1E2333] font-medium">{a.hours}</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3]">
            រកមិនឃើញកំណត់ត្រាដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរក
          </div>
        )}
      </div>
      <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
    </>
  );
}
