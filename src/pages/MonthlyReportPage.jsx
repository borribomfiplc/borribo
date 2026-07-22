import React, { useMemo, useState } from "react";
import { FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { COLORS } from "../data/theme";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";
import { exportCsv, printReport } from "../utils/reportExport";
import { todayISO } from "../utils/attendance";

export default function MonthlyReportPage({ historyData = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(() => todayISO().slice(0, 7));
  const rows = useMemo(() => historyData.filter((row) => row.dateISO?.startsWith(selectedMonth)), [historyData, selectedMonth]);
  const monthLabel = useMemo(() => new Intl.DateTimeFormat("km-KH", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`)), [selectedMonth]);

  const trend = useMemo(() => {
    const groups = rows.reduce((result, row) => {
      if (!result[row.dateISO]) result[row.dateISO] = { dateISO: row.dateISO, present: 0, late: 0, absent: 0, leave: 0 };
      if (row.status === "មានវត្តមាន") result[row.dateISO].present += 1;
      else if (row.status === "យឺត") result[row.dateISO].late += 1;
      else if (row.status === "អវត្តមាន") result[row.dateISO].absent += 1;
      else if (row.status === "ច្បាប់") result[row.dateISO].leave += 1;
      return result;
    }, {});
    return Object.values(groups).sort((a, b) => a.dateISO.localeCompare(b.dateISO)).map((group) => ({ ...group, day: Number(group.dateISO.slice(8, 10)) }));
  }, [rows]);

  const ranked = useMemo(() => {
    const stats = rows.reduce((result, row) => {
      if (!result[row.id]) result[row.id] = { id: row.id, name: row.name, role: row.role, late: 0, absent: 0 };
      if (row.status === "យឺត") result[row.id].late += 1;
      if (row.status === "អវត្តមាន") result[row.id].absent += 1;
      return result;
    }, {});
    return Object.values(stats).filter((employee) => employee.late + employee.absent > 0).sort((a, b) => b.late + b.absent - (a.late + a.absent));
  }, [rows]);

  const presentLike = rows.filter((row) => row.status === "មានវត្តមាន" || row.status === "យឺត").length;
  const rate = rows.length ? ((presentLike / rows.length) * 100).toFixed(0) : "0";
  const downloadCsv = () => exportCsv({
    filename: `monthly-attendance-${selectedMonth}`,
    columns: [
      { label: "កាលបរិច្ឆេទ", value: "dateISO" }, { label: "លេខបុគ្គលិក", value: "id" }, { label: "ឈ្មោះ", value: "name" },
      { label: "តួនាទី", value: "role" }, { label: "សាខា", value: "branch" }, { label: "Check-in", value: "checkIn" },
      { label: "Check-out", value: "checkOut" }, { label: "ស្ថានភាព", value: "status" }, { label: "យឺត (នាទី)", value: (row) => row.lateMinutes || 0 },
      { label: "ចេញមុន (នាទី)", value: (row) => row.earlyLeaveMinutes || 0 }, { label: "ម៉ោងធ្វើការ", value: "hours" },
    ], rows,
  });

  return (
    <>
      <ReportHeader title="របាយការណ៍ប្រចាំខែ" sub={`${monthLabel} · ${rows.length} កំណត់ត្រា`} onExportCsv={downloadCsv} onPrint={printReport} />
      <div className="report-filters mb-5 max-w-xs rounded-2xl border border-[#EBEDF3] bg-white p-4"><label className="text-xs text-[#5B5F73]">ជ្រើសខែ<input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></label></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={FileText} label="កំណត់ត្រាសរុប" value={rows.length} sub={monthLabel} iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary} />
        <StatCard icon={CheckCircle2} label="អត្រាវត្តមាន" value={`${rate}%`} sub="រួមទាំងមកយឺត" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
        <StatCard icon={AlertCircle} label="ករណីមកយឺត" value={rows.filter((row) => row.status === "យឺត").length} sub={monthLabel} iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
        <StatCard icon={XCircle} label="ករណីអវត្តមាន" value={rows.filter((row) => row.status === "អវត្តមាន").length} sub={monthLabel} iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} />
      </div>
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 mb-5"><h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">និន្នាការវត្តមានប្រចាំថ្ងៃ</h3><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="present" name="មានវត្តមាន" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="late" name="យឺត" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="absent" name="អវត្តមាន" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></div>
      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="px-5 py-4 border-b border-[#EBEDF3]"><h3 className="font-semibold text-[#1E2333] text-[15px]">បុគ្គលិកដែលមានករណីច្រើនបំផុត</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead><tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs"><th className="font-medium px-5 py-3">បុគ្គលិក</th><th className="font-medium px-5 py-3">ករណីមកយឺត</th><th className="font-medium px-5 py-3">ករណីអវត្តមាន</th></tr></thead><tbody>{!ranked.length && <tr><td colSpan={3} className="text-center text-[#8A8FA3] text-sm py-10">មិនមានករណីមកយឺត ឬអវត្តមានក្នុងខែនេះទេ</td></tr>}{ranked.map((employee) => <tr key={employee.id} className="border-t border-[#EBEDF3]"><td className="px-5 py-3.5"><div className="font-medium text-[#1E2333]">{employee.name}</div><div className="text-xs text-[#8A8FA3]">{employee.role}</div></td><td className="px-5 py-3.5 text-[#5B5F73]">{employee.late}</td><td className="px-5 py-3.5 text-[#5B5F73]">{employee.absent}</td></tr>)}</tbody></table></div></div>
    </>
  );
}
