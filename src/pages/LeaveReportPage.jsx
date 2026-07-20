import React from "react";
import {
  CalendarDays, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { COLORS } from "../data/theme";
import { leaveData, leaveTypeStyle } from "../data/mockData";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";

export default function LeaveReportPage({ leaveRequests }) {
  const total = leaveData.reduce((a, b) => a + b.value, 0);
  const counts = {
    approved: leaveRequests.filter((r) => r.status === "បានអនុម័ត").length,
    pending: leaveRequests.filter((r) => r.status === "រង់ចាំពិនិត្យ").length,
    rejected: leaveRequests.filter((r) => r.status === "បានបដិសេធ").length,
  };
  const totalDays = leaveRequests.reduce((a, r) => a + (r.days || 0), 0);

  return (
    <>
      <ReportHeader title="របាយការណ៍ច្បាប់" sub="សង្ខេបសំណើច្បាប់ឈប់សម្រាក តាមប្រភេទ និងស្ថានភាព" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={CheckCircle2} label="បានអនុម័ត" value={counts.approved} sub="សំណើសរុប" iconBg={COLORS.greenLight} iconColor={COLORS.green} chartColor={COLORS.green} />
        <StatCard icon={AlertCircle} label="រង់ចាំពិនិត្យ" value={counts.pending} sub="សំណើសរុប" iconBg={COLORS.amberLight} iconColor={COLORS.accent} chartColor={COLORS.accent} />
        <StatCard icon={XCircle} label="បានបដិសេធ" value={counts.rejected} sub="សំណើសរុប" iconBg={COLORS.redLight} iconColor={COLORS.red} chartColor={COLORS.red} />
        <StatCard icon={CalendarDays} label="ចំនួនថ្ងៃសរុប" value={totalDays} sub="ថ្ងៃច្បាប់ស្នើសុំទាំងអស់" iconBg={COLORS.primaryLight} iconColor={COLORS.primary} chartColor={COLORS.primary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-5 lg:col-span-1">
          <h3 className="font-semibold text-[#1E2333] text-[15px] mb-4">តាមប្រភេទច្បាប់</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-[130px] h-[130px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveData} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2}>
                    {leaveData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-[#8A8FA3]">សរុប</span>
                <span className="text-xl font-bold text-[#1E2333]">{total}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2.5">
              {leaveData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-[#5B5F73]">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="text-[#1E2333] font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-[#EBEDF3]">
            <h3 className="font-semibold text-[#1E2333] text-[15px]">សំណើច្បាប់ទាំងអស់</h3>
          </div>
          <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
                <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
                <th className="text-right font-medium px-5 py-3">ប្រភេទ</th>
                <th className="text-right font-medium px-5 py-3">រយៈពេល</th>
                <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((r) => (
                <tr key={r.id} className="border-t border-[#EBEDF3]">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-[#1E2333]">{r.name}</div>
                    <div className="text-xs text-[#8A8FA3]">{r.branch}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: leaveTypeStyle[r.leaveType]?.bg, color: leaveTypeStyle[r.leaveType]?.fg }}>
                      {r.leaveType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{r.startDate} – {r.endDate} ({r.days}ថ្ងៃ)</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1"
                      style={{
                        background: r.status === "បានអនុម័ត" ? COLORS.greenLight : r.status === "បានបដិសេធ" ? COLORS.redLight : COLORS.amberLight,
                        color: r.status === "បានអនុម័ត" ? COLORS.green : r.status === "បានបដិសេធ" ? COLORS.red : COLORS.accent,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </>
  );
}
