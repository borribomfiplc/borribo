import React, { useState } from "react";
import {
  CalendarDays, Search, ChevronDown, AlertCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { leaveTypeStyle, leaveTypes, leaveQuotas } from "../data/mockData";
import LeaveBalanceBar from "../components/shared/LeaveBalanceBar";
import StatCard from "../components/shared/StatCard";

export default function LeaveBalancePage({ requests, employees }) {
  const [branchFilter, setBranchFilter] = useState("គ្រប់សាខា");
  const [search, setSearch] = useState("");

  const branches = ["គ្រប់សាខា", ...Array.from(new Set(employees.map((e) => e.branch)))];

  const usedDays = (empId, type) =>
    requests
      .filter((r) => (r.employeeId === empId || r.empId === empId) && r.leaveType === type && r.status === "បានអនុម័ត")
      .reduce((sum, r) => sum + Number(r.days || 0), 0);

  const totalQuota = leaveTypes.reduce((sum, t) => sum + leaveQuotas[t], 0);

  const filteredEmployees = employees.filter(
    (e) =>
      (branchFilter === "គ្រប់សាខា" || e.branch === branchFilter) &&
      (search.trim() === "" ||
        e.name.includes(search.trim()) ||
        e.id.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const totalUsedByType = (type) =>
    requests.filter((r) => r.leaveType === type && r.status === "បានអនុម័ត").reduce((sum, r) => sum + r.days, 0);

  const lowBalanceCount = employees.filter((e) => {
    const remaining = leaveTypes.reduce((sum, t) => sum + Math.max(0, leaveQuotas[t] - usedDays(e.id, t)), 0);
    return totalQuota > 0 && remaining / totalQuota < 0.2;
  }).length;

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">សមតុល្យច្បាប់</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
          តាមដានចំនួនថ្ងៃច្បាប់ដែលបានប្រើ និងនៅសល់សម្រាប់បុគ្គលិកនីមួយៗ
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard
          icon={CalendarDays}
          label="ច្បាប់ប្រចាំឆ្នាំបានប្រើ"
          value={`${totalUsedByType("ច្បាប់ប្រចាំឆ្នាំ")} ថ្ងៃ`}
          sub="ក្នុងចំណោមបុគ្គលិកទាំងអស់"
          iconBg={COLORS.primaryLight}
          iconColor={COLORS.primary}
          chartColor={COLORS.primary}
        />
        <StatCard
          icon={CalendarDays}
          label="ច្បាប់ឈឺបានប្រើ"
          value={`${totalUsedByType("ច្បាប់ឈឺ")} ថ្ងៃ`}
          sub="ក្នុងចំណោមបុគ្គលិកទាំងអស់"
          iconBg={COLORS.greenLight}
          iconColor={COLORS.green}
          chartColor={COLORS.green}
        />
        <StatCard
          icon={AlertCircle}
          label="នៅសល់តិចជាង ២០%"
          value={lowBalanceCount}
          sub="បុគ្គលិកត្រូវការការយកចិត្តទុកដាក់"
          iconBg={COLORS.redLight}
          iconColor={COLORS.red}
          chartColor={COLORS.red}
        />
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-48"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ស្វែងរកបុគ្គលិក..."
            className="w-full bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20"
          />
          <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6]" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
              {leaveTypes.map((t) => (
                <th key={t} className="text-right font-medium px-5 py-3">{t}</th>
              ))}
              <th className="text-right font-medium px-5 py-3">សរុបនៅសល់</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((e) => {
              const remainingTotal = leaveTypes.reduce(
                (sum, t) => sum + Math.max(0, leaveQuotas[t] - usedDays(e.id, t)),
                0
              );
              return (
                <tr key={e.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60 align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {e.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{e.name}</div>
                        <div className="text-xs text-[#B4B7C6]">{e.branch}</div>
                      </div>
                    </div>
                  </td>
                  {leaveTypes.map((t) => {
                    const used = usedDays(e.id, t);
                    const quota = leaveQuotas[t];
                    const color = leaveTypeStyle[t].fg;
                    return (
                      <td key={t} className="px-5 py-3.5 w-[130px]">
                        <div className="text-xs text-[#1E2333] font-medium mb-1.5" dir="ltr">
                          {used} / {quota} ថ្ងៃ
                        </div>
                        <LeaveBalanceBar used={used} quota={quota} color={color} />
                      </td>
                    );
                  })}
                  <td className="px-5 py-3.5 text-[#1E2333] font-semibold whitespace-nowrap">
                    {remainingTotal} ថ្ងៃ
                  </td>
                </tr>
              );
            })}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={leaveTypes.length + 2} className="text-center text-[#8A8FA3] text-sm py-10">
                  មិនមានបុគ្គលិកត្រូវនឹងលក្ខខណ្ឌនេះទេ
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredEmployees.map((e) => {
          const remainingTotal = leaveTypes.reduce(
            (sum, t) => sum + Math.max(0, leaveQuotas[t] - usedDays(e.id, t)),
            0
          );
          return (
            <div key={e.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {e.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{e.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">{e.branch}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-[#8A8FA3]">សរុបនៅសល់</div>
                  <div className="text-sm font-semibold text-[#1E2333]">{remainingTotal} ថ្ងៃ</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 border-t border-[#EBEDF3] pt-3">
                {leaveTypes.map((t) => {
                  const used = usedDays(e.id, t);
                  const quota = leaveQuotas[t];
                  const color = leaveTypeStyle[t].fg;
                  return (
                    <div key={t}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[#5B5F73]">{t}</span>
                        <span className="text-[#1E2333] font-medium" dir="ltr">{used} / {quota} ថ្ងៃ</span>
                      </div>
                      <LeaveBalanceBar used={used} quota={quota} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filteredEmployees.length === 0 && (
          <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3]">
            មិនមានបុគ្គលិកត្រូវនឹងលក្ខខណ្ឌនេះទេ
          </div>
        )}
      </div>
    </>
  );
}
