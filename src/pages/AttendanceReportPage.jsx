import React, { useMemo } from "react";
import {
  CalendarDays, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { COLORS } from "../data/theme";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";

export default function AttendanceReportPage({ historyData }) {
  const weekData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index));
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh" }).format(date);
    });
    return dates.map((dateISO) => {
      const rows = historyData.filter((row) => row.dateISO === dateISO);
      return { day: new Intl.DateTimeFormat("km-KH", { weekday: "short" }).format(new Date(`${dateISO}T12:00:00`)), present: rows.filter((row) => row.status === "មានវត្តមាន").length, late: rows.filter((row) => row.status === "យឺត").length, absent: rows.filter((row) => row.status === "អវត្តមាន").length, leave: rows.filter((row) => row.status === "ច្បាប់").length };
    });
  }, [historyData]);
  const totals = weekData.reduce(
    (acc, d) => ({
      present: acc.present + d.present,
      late: acc.late + d.late,
      absent: acc.absent + d.absent,
      leave: acc.leave + d.leave,
    }),
    { present: 0, late: 0, absent: 0, leave: 0 }
  );

  const branchStats = {};
  historyData.forEach((r) => {
    if (!branchStats[r.branch]) branchStats[r.branch] = { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
    branchStats[r.branch].total += 1;
    if (r.status === "មានវត្តមាន") branchStats[r.branch].present += 1;
    else if (r.status === "យឺត") branchStats[r.branch].late += 1;
    else if (r.status === "អវត្តមាន") branchStats[r.branch].absent += 1;
    else if (r.status === "ច្បាប់") branchStats[r.branch].leave += 1;
  });

  return (
    <>
      <ReportHeader title="របាយការណ៍វត្តមាន" sub="សង្ខេបវត្តមានប្រចាំសប្តាហ៍ និងតាមសាខា" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={CheckCircle2} label="មានវត្តមាន" value={totals.present} sub="សរុបក្នុងសប្តាហ៍" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
        <StatCard icon={AlertCircle} label="មកយឺត" value={totals.late} sub="សរុបក្នុងសប្តាហ៍" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
        <StatCard icon={XCircle} label="អវត្តមាន" value={totals.absent} sub="សរុបក្នុងសប្តាហ៍" iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} />
        <StatCard icon={CalendarDays} label="ច្បាប់ឈប់សម្រាក" value={totals.leave} sub="សរុបក្នុងសប្តាហ៍" iconBg={COLORS.purpleLight} iconColor={COLORS.purple} chartColor={COLORS.purple} />
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 mb-5">
        <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">និន្នាការវត្តមានប្រចាំសប្តាហ៍</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="មានវត្តមាន" fill={COLORS.green} radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" name="យឺត" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="អវត្តមាន" fill={COLORS.red} radius={[4, 4, 0, 0]} />
              <Bar dataKey="leave" name="ច្បាប់" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EBEDF3]">
          <h3 className="font-semibold text-[#1E2333] text-[15px]">សង្ខេបតាមសាខា (៥ថ្ងៃចុងក្រោយ)</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">សាខា</th>
              <th className="text-right font-medium px-5 py-3">មានវត្តមាន</th>
              <th className="text-right font-medium px-5 py-3">យឺត</th>
              <th className="text-right font-medium px-5 py-3">អវត្តមាន</th>
              <th className="text-right font-medium px-5 py-3">ច្បាប់</th>
              <th className="text-right font-medium px-5 py-3">អត្រាវត្តមាន</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(branchStats).map(([branch, s]) => (
              <tr key={branch} className="border-t border-[#EBEDF3]">
                <td className="px-5 py-3.5 font-medium text-[#1E2333]">{branch}</td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{s.present}</td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{s.late}</td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{s.absent}</td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{s.leave}</td>
                <td className="px-5 py-3.5 text-[#1E2333] font-medium">{(((s.present + s.late) / s.total) * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
