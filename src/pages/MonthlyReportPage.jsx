import React from "react";
import {
  FileText, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { COLORS } from "../data/theme";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";

export default function MonthlyReportPage({ historyData }) {
  const dayGroups = {};
  historyData.forEach((r) => {
    if (!dayGroups[r.dateISO]) dayGroups[r.dateISO] = { date: r.date, present: 0, late: 0, absent: 0, leave: 0 };
    if (r.status === "មានវត្តមាន") dayGroups[r.dateISO].present += 1;
    else if (r.status === "យឺត") dayGroups[r.dateISO].late += 1;
    else if (r.status === "អវត្តមាន") dayGroups[r.dateISO].absent += 1;
    else if (r.status === "ច្បាប់") dayGroups[r.dateISO].leave += 1;
  });
  const trend = Object.keys(dayGroups)
    .sort()
    .map((k) => ({ day: dayGroups[k].date.split(" ")[0], ...dayGroups[k] }));

  const empStats = {};
  historyData.forEach((r) => {
    if (!empStats[r.id]) empStats[r.id] = { name: r.name, role: r.role, late: 0, absent: 0, total: 0 };
    empStats[r.id].total += 1;
    if (r.status === "យឺត") empStats[r.id].late += 1;
    if (r.status === "អវត្តមាន") empStats[r.id].absent += 1;
  });
  const ranked = Object.values(empStats)
    .filter((e) => e.late + e.absent > 0)
    .sort((a, b) => b.late + b.absent - (a.late + a.absent));

  const totalRecords = historyData.length;
  const presentLike = historyData.filter((r) => r.status === "មានវត្តមាន" || r.status === "យឺត").length;
  const rate = ((presentLike / totalRecords) * 100).toFixed(0);

  return (
    <>
      <ReportHeader title="របាយការណ៍ប្រចាំខែ" sub="កក្កដា ២០២៦ · សង្ខេបនិន្នាការវត្តមាន និងចំណាត់ថ្នាក់បុគ្គលិក" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={FileText} label="កំណត់ត្រាសរុប" value={totalRecords} sub="៥ថ្ងៃចុងក្រោយ" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary} />
        <StatCard icon={CheckCircle2} label="អត្រាវត្តមាន" value={`${rate}%`} sub="រួមទាំងមកយឺត" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
        <StatCard icon={AlertCircle} label="ករណីមកយឺត" value={historyData.filter((r) => r.status === "យឺត").length} sub="៥ថ្ងៃចុងក្រោយ" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
        <StatCard icon={XCircle} label="ករណីអវត្តមាន" value={historyData.filter((r) => r.status === "អវត្តមាន").length} sub="៥ថ្ងៃចុងក្រោយ" iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} />
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 mb-5">
        <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">និន្នាការវត្តមានប្រចាំថ្ងៃ</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: COLORS.sub }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="present" name="មានវត្តមាន" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="late" name="យឺត" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="absent" name="អវត្តមាន" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EBEDF3]">
          <h3 className="font-semibold text-[#1E2333] text-[15px]">បុគ្គលិកដែលមានករណីច្រើនបំផុត</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
              <th className="text-right font-medium px-5 py-3">ករណីមកយឺត</th>
              <th className="text-right font-medium px-5 py-3">ករណីអវត្តមាន</th>
            </tr>
          </thead>
          <tbody>
            {ranked.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-[#8A8FA3] text-sm py-10">
                  មិនមានករណីមកយឺត ឬអវត្តមានក្នុងរយៈពេលនេះទេ
                </td>
              </tr>
            )}
            {ranked.map((e) => (
              <tr key={e.name} className="border-t border-[#EBEDF3]">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-[#1E2333]">{e.name}</div>
                  <div className="text-xs text-[#8A8FA3]">{e.role}</div>
                </td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{e.late}</td>
                <td className="px-5 py-3.5 text-[#5B5F73]">{e.absent}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
