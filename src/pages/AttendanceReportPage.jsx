import React, { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { COLORS } from "../data/theme";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";
import { exportCsv, printReport } from "../utils/reportExport";
import { todayISO } from "../utils/attendance";

const daysAgo = (days) => {
  const date = new Date(); date.setDate(date.getDate() - days); return todayISO(date);
};

export default function AttendanceReportPage({ historyData = [] }) {
  const [fromDate, setFromDate] = useState(() => daysAgo(6));
  const [toDate, setToDate] = useState(() => todayISO());
  const filtered = useMemo(() => historyData.filter((row) => (
    (!fromDate || row.dateISO >= fromDate) && (!toDate || row.dateISO <= toDate)
  )), [fromDate, historyData, toDate]);

  const trend = useMemo(() => {
    const groups = {};
    filtered.forEach((row) => {
      if (!groups[row.dateISO]) groups[row.dateISO] = { dateISO: row.dateISO, present: 0, late: 0, absent: 0, leave: 0 };
      if (row.status === "មានវត្តមាន") groups[row.dateISO].present += 1;
      else if (row.status === "យឺត") groups[row.dateISO].late += 1;
      else if (row.status === "អវត្តមាន") groups[row.dateISO].absent += 1;
      else if (row.status === "ច្បាប់") groups[row.dateISO].leave += 1;
    });
    return Object.values(groups).sort((a, b) => a.dateISO.localeCompare(b.dateISO)).map((group) => ({
      ...group, day: new Intl.DateTimeFormat("km-KH", { month: "short", day: "numeric" }).format(new Date(`${group.dateISO}T12:00:00`)),
    }));
  }, [filtered]);

  const totals = filtered.reduce((acc, row) => ({
    present: acc.present + (row.status === "មានវត្តមាន" ? 1 : 0),
    late: acc.late + (row.status === "យឺត" ? 1 : 0),
    absent: acc.absent + (row.status === "អវត្តមាន" ? 1 : 0),
    leave: acc.leave + (row.status === "ច្បាប់" ? 1 : 0),
  }), { present: 0, late: 0, absent: 0, leave: 0 });

  const branchStats = filtered.reduce((stats, row) => {
    const branch = row.branch || "មិនបានកំណត់";
    if (!stats[branch]) stats[branch] = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    stats[branch].total += 1;
    if (row.status === "មានវត្តមាន") stats[branch].present += 1;
    else if (row.status === "យឺត") stats[branch].late += 1;
    else if (row.status === "អវត្តមាន") stats[branch].absent += 1;
    else if (row.status === "ច្បាប់") stats[branch].leave += 1;
    return stats;
  }, {});

  const downloadCsv = () => exportCsv({
    filename: `attendance-report-${fromDate || "all"}-${toDate || "all"}`,
    columns: [
      { label: "កាលបរិច្ឆេទ", value: "dateISO" }, { label: "លេខបុគ្គលិក", value: "id" },
      { label: "ឈ្មោះ", value: "name" }, { label: "តួនាទី", value: "role" },
      { label: "សាខា", value: "branch" }, { label: "វេន", value: "shift" },
      { label: "Check-in", value: "checkIn" }, { label: "Check-out", value: "checkOut" },
      { label: "ស្ថានភាព", value: "status" }, { label: "យឺត (នាទី)", value: (row) => row.lateMinutes || 0 },
      { label: "ចេញមុន (នាទី)", value: (row) => row.earlyLeaveMinutes || 0 }, { label: "ម៉ោងធ្វើការ", value: "hours" },
    ],
    rows: filtered,
  });

  return (
    <>
      <ReportHeader title="របាយការណ៍វត្តមាន" sub={`${fromDate || "ដំបូង"} ដល់ ${toDate || "បច្ចុប្បន្ន"} · ${filtered.length} កំណត់ត្រា`} onExportCsv={downloadCsv} onPrint={printReport} />
      <div className="report-filters mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-[#EBEDF3] bg-white p-4 min-[420px]:grid-cols-2 sm:max-w-xl">
        <label className="text-xs text-[#5B5F73]">ពីថ្ងៃ<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></label>
        <label className="text-xs text-[#5B5F73]">ដល់ថ្ងៃ<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></label>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={CheckCircle2} label="មានវត្តមាន" value={totals.present} sub="ក្នុងរយៈពេល" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
        <StatCard icon={AlertCircle} label="មកយឺត" value={totals.late} sub="ក្នុងរយៈពេល" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
        <StatCard icon={XCircle} label="អវត្តមាន" value={totals.absent} sub="ក្នុងរយៈពេល" iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} />
        <StatCard icon={CalendarDays} label="ច្បាប់ឈប់សម្រាក" value={totals.leave} sub="ក្នុងរយៈពេល" iconBg={COLORS.purpleLight} iconColor={COLORS.purple} chartColor={COLORS.purple} />
      </div>
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 mb-5">
        <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">និន្នាការវត្តមាន</h3>
        <div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.sub }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="present" name="មានវត្តមាន" fill={COLORS.green} radius={[4, 4, 0, 0]} /><Bar dataKey="late" name="យឺត" fill={COLORS.accent} radius={[4, 4, 0, 0]} /><Bar dataKey="absent" name="អវត្តមាន" fill={COLORS.red} radius={[4, 4, 0, 0]} /><Bar dataKey="leave" name="ច្បាប់" fill={COLORS.purple} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="px-5 py-4 border-b border-[#EBEDF3]"><h3 className="font-semibold text-[#1E2333] text-[15px]">សង្ខេបតាមសាខា</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs"><th className="font-medium px-5 py-3">សាខា</th><th className="font-medium px-5 py-3">មានវត្តមាន</th><th className="font-medium px-5 py-3">យឺត</th><th className="font-medium px-5 py-3">អវត្តមាន</th><th className="font-medium px-5 py-3">ច្បាប់</th><th className="font-medium px-5 py-3">អត្រាវត្តមាន</th></tr></thead><tbody>{Object.entries(branchStats).map(([branch, stats]) => <tr key={branch} className="border-t border-[#EBEDF3]"><td className="px-5 py-3.5 font-medium text-[#1E2333]">{branch}</td><td className="px-5 py-3.5 text-[#5B5F73]">{stats.present}</td><td className="px-5 py-3.5 text-[#5B5F73]">{stats.late}</td><td className="px-5 py-3.5 text-[#5B5F73]">{stats.absent}</td><td className="px-5 py-3.5 text-[#5B5F73]">{stats.leave}</td><td className="px-5 py-3.5 text-[#1E2333] font-medium">{stats.total ? (((stats.present + stats.late) / stats.total) * 100).toFixed(0) : 0}%</td></tr>)}{!Object.keys(branchStats).length && <tr><td colSpan={6} className="py-10 text-center text-[#8A8FA3]">មិនមានទិន្នន័យក្នុងរយៈពេលនេះទេ</td></tr>}</tbody></table></div></div>
    </>
  );
}
