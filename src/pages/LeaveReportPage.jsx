import React, { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, Trophy } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { COLORS } from "../data/theme";
import { leaveTypeStyle, leaveTypes } from "../data/mockData";
import ReportHeader from "../components/shared/ReportHeader";
import StatCard from "../components/shared/StatCard";
import { exportCsv, printReport } from "../utils/reportExport";
import { todayISO } from "../utils/attendance";

const startOfYear = () => `${todayISO().slice(0, 4)}-01-01`;

export default function LeaveReportPage({ leaveRequests = [] }) {
  const [fromDate, setFromDate] = useState(startOfYear);
  const [toDate, setToDate] = useState(() => todayISO());
  const filteredRequests = useMemo(() => leaveRequests.filter((request) => {
    const date = request.requestedOn || request.startDate || "";
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }), [fromDate, leaveRequests, toDate]);
  const leaveData = leaveTypes.map((name, index) => ({
    name,
    value: filteredRequests.filter((request) => request.leaveType === name).length,
    color: [COLORS.primary, COLORS.green, COLORS.accent, COLORS.purple][index],
  })).filter((item) => item.value > 0);
  const total = leaveData.reduce((a, b) => a + b.value, 0);
  const counts = {
    approved: filteredRequests.filter((r) => r.status === "បានអនុម័ត").length,
    pending: filteredRequests.filter((r) => r.status === "រង់ចាំពិនិត្យ").length,
    rejected: filteredRequests.filter((r) => r.status === "បានបដិសេធ").length,
  };
  const totalDays = filteredRequests.reduce((a, r) => a + (Number(r.days) || 0), 0);
  const employeesWithMostCases = Object.values(filteredRequests.reduce((acc, request) => {
    const key = request.empId || request.name;
    if (!acc[key]) acc[key] = { id: key, name: request.name, role: request.role, branch: request.branch, cases: 0, days: 0, pending: 0 };
    acc[key].cases += 1;
    acc[key].days += Number(request.days) || 0;
    if (request.status === "រង់ចាំពិនិត្យ") acc[key].pending += 1;
    return acc;
  }, {})).sort((a, b) => b.cases - a.cases || b.days - a.days).slice(0, 5);
  const downloadCsv = () => exportCsv({
    filename: `leave-report-${fromDate || "all"}-${toDate || "all"}`,
    columns: [
      { label: "ថ្ងៃស្នើ", value: (row) => row.requestedOn || "" }, { label: "លេខបុគ្គលិក", value: (row) => row.employeeId || row.empId || "" },
      { label: "ឈ្មោះ", value: "name" }, { label: "តួនាទី", value: "role" }, { label: "សាខា", value: "branch" },
      { label: "ប្រភេទច្បាប់", value: "leaveType" }, { label: "ថ្ងៃចាប់ផ្ដើម", value: "startDate" }, { label: "ថ្ងៃបញ្ចប់", value: "endDate" },
      { label: "ចំនួនថ្ងៃ", value: "days" }, { label: "ស្ថានភាព", value: "status" }, { label: "ហេតុផល", value: "reason" },
    ], rows: filteredRequests,
  });

  return (
    <>
      <ReportHeader title="របាយការណ៍ច្បាប់" sub={`${fromDate || "ដំបូង"} ដល់ ${toDate || "បច្ចុប្បន្ន"} · ${filteredRequests.length} សំណើ`} onExportCsv={downloadCsv} onPrint={printReport} />

      <div className="report-filters mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-[#EBEDF3] bg-white p-4 min-[420px]:grid-cols-2 sm:max-w-xl">
        <label className="text-xs text-[#5B5F73]">ពីថ្ងៃ<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></label>
        <label className="text-xs text-[#5B5F73]">ដល់ថ្ងៃ<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-sm outline-none" /></label>
      </div>

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
                  <Pie data={leaveData.length ? leaveData : [{ name: "មិនទាន់មាន", value: 1, color: "#E5E7EB" }]} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={2}>
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
              {filteredRequests.map((r) => (
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
              {!filteredRequests.length && <tr><td colSpan={4} className="py-10 text-center text-sm text-[#8A8FA3]">មិនមានសំណើក្នុងរយៈពេលនេះទេ</td></tr>}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EBEDF3] flex items-center gap-2">
          <Trophy size={17} className="text-[#E8A33D]" />
          <div><h3 className="font-semibold text-[#1E2333] text-[15px]">បុគ្គលិកដែលមានករណីច្រើនបំផុត</h3><p className="text-xs text-[#8A8FA3] mt-0.5">តម្រៀបតាមចំនួនសំណើច្បាប់សរុប</p></div>
        </div>
        {employeesWithMostCases.length ? <div className="divide-y divide-[#EBEDF3]">
          {employeesWithMostCases.map((employee, index) => <div key={employee.id} className="flex items-center gap-3 px-5 py-3.5">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: index === 0 ? COLORS.amberLight : COLORS.primaryLight, color: index === 0 ? COLORS.accent : COLORS.primary }}>{index + 1}</span>
            <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center">{employee.name?.slice(0, 1)}</div>
            <div className="flex-1 min-w-0"><div className="font-medium text-[#1E2333] text-sm truncate">{employee.name}</div><div className="text-xs text-[#8A8FA3] truncate">{employee.role} · {employee.branch}</div></div>
            <div className="text-left"><div className="font-bold text-[#1E2333] text-sm">{employee.cases} ករណី</div><div className="text-xs text-[#8A8FA3]">{employee.days} ថ្ងៃ {employee.pending ? `· រង់ចាំ ${employee.pending}` : ""}</div></div>
          </div>)}
        </div> : <div className="py-10 text-center text-sm text-[#8A8FA3]">មិនទាន់មានទិន្នន័យសំណើច្បាប់ទេ</div>}
      </div>
    </>
  );
}
