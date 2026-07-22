import React, { useState } from "react";
import {
  ChevronDown, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { correctionStatusStyle, leaveTypeStyle, leaveTypes } from "../data/mockData";
import StatCard from "../components/shared/StatCard";

export default function LeaveApprovalPage({ requests, setRequests, employees }) {
  const [branchFilter, setBranchFilter] = useState("គ្រប់សាខា");
  const [typeFilter, setTypeFilter] = useState("គ្រប់ប្រភេទ");
  const [showHistory, setShowHistory] = useState(false);

  const branches = ["គ្រប់សាខា", ...Array.from(new Set(employees.map((e) => e.branch)))];
  const typeOptions = ["គ្រប់ប្រភេទ", ...leaveTypes];

  const matchesFilters = (r) =>
    (branchFilter === "គ្រប់សាខា" || r.branch === branchFilter) &&
    (typeFilter === "គ្រប់ប្រភេទ" || r.leaveType === typeFilter);

  // Oldest-submitted first, since newest requests are unshifted to the front of the list
  const pending = requests.filter((r) => r.status === "រង់ចាំពិនិត្យ" && matchesFilters(r)).slice().reverse();
  const decidedRecent = requests.filter((r) => r.status !== "រង់ចាំពិនិត្យ" && matchesFilters(r)).slice(0, 6);

  const counts = {
    pending: requests.filter((r) => r.status === "រង់ចាំពិនិត្យ").length,
    approved: requests.filter((r) => r.status === "បានអនុម័ត").length,
    rejected: requests.filter((r) => r.status === "បានបដិសេធ").length,
  };

  const decide = (id, decision) => {
    setRequests((list) => list.map((r) => (r.id === id ? { ...r, status: decision } : r)));
  };

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">អនុម័តច្បាប់</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
          ពិនិត្យ និងសម្រេចលើសំណើសុំច្បាប់ដែលកំពុងរង់ចាំការអនុម័ត
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard
          icon={AlertCircle}
          label="រង់ចាំពិនិត្យ"
          value={counts.pending}
          sub="សំណើត្រូវការការសម្រេច"
          iconBg={COLORS.amberLight}
          iconColor={COLORS.accent}
          chartColor={COLORS.accent}
        />
        <StatCard
          icon={CheckCircle2}
          label="បានអនុម័ត"
          value={counts.approved}
          sub="សំណើដែលបានយល់ព្រម"
          iconBg={COLORS.greenLight}
          iconColor={COLORS.green}
          chartColor={COLORS.green}
        />
        <StatCard
          icon={XCircle}
          label="បានបដិសេធ"
          value={counts.rejected}
          sub="សំណើដែលមិនបានអនុម័ត"
          iconBg={COLORS.redLight}
          iconColor={COLORS.red}
          chartColor={COLORS.red}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#8A8FA3] font-medium shrink-0">ត្រងតាម៖</span>
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
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-48"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B4B7C6] pointer-events-none" />
        </div>
      </div>

      {/* Pending queue */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#1E2333] text-[15px]">
          សំណើរង់ចាំការសម្រេច <span className="text-[#8A8FA3] font-normal">({pending.length})</span>
        </h3>
      </div>

      {pending.length === 0 ? (
        <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3] mb-6">
          មិនមានសំណើណាមួយកំពុងរង់ចាំការសម្រេចទេ
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {pending.map((r) => {
            const lt = leaveTypeStyle[r.leaveType] || { bg: COLORS.purpleLight, fg: COLORS.purple };
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                      {r.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-medium text-[#1E2333]">{r.name}</div>
                      <div className="text-xs text-[#8A8FA3]">{r.role} · {r.branch}</div>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium rounded-full px-2.5 py-1 inline-block shrink-0"
                    style={{ background: lt.bg, color: lt.fg }}
                  >
                    {r.leaveType}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <div className="text-[11px] text-[#8A8FA3] mb-0.5">រយៈពេលច្បាប់</div>
                    <div className="text-[#1E2333] font-medium">
                      {r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A8FA3] mb-0.5">ចំនួនថ្ងៃ</div>
                    <div className="text-[#1E2333] font-medium">{r.days} ថ្ងៃ</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A8FA3] mb-0.5">ស្នើនៅថ្ងៃ</div>
                    <div className="text-[#1E2333] font-medium">{r.requestedOn}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#EBEDF3]">
                  <div className="text-[11px] text-[#8A8FA3] mb-1">ហេតុផល</div>
                  <div className="text-sm text-[#5B5F73] leading-relaxed">{r.reason}</div>
                </div>

                <div className="flex items-center gap-2.5 mt-4">
                  <button
                    onClick={() => decide(r.id, "បានអនុម័ត")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5"
                    style={{ background: COLORS.greenLight, color: COLORS.green }}
                  >
                    <CheckCircle2 size={16} /> អនុម័ត
                  </button>
                  <button
                    onClick={() => decide(r.id, "បានបដិសេធ")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5"
                    style={{ background: COLORS.redLight, color: COLORS.red }}
                  >
                    <XCircle size={16} /> បដិសេធ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently decided (collapsible) */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-[#1E2333] text-[15px]">ការសម្រេចថ្មីៗ</h3>
          <ChevronDown
            size={16}
            className={`text-[#8A8FA3] transition-transform ${showHistory ? "rotate-180" : ""}`}
          />
        </button>
        {showHistory && (
          <div className="flex flex-col gap-2.5 mt-4">
            {decidedRecent.length === 0 && (
              <div className="text-center text-[#8A8FA3] text-sm py-6">មិនទាន់មានការសម្រេចនៅឡើយទេ</div>
            )}
            {decidedRecent.map((r) => {
              const st = correctionStatusStyle[r.status];
              const lt = leaveTypeStyle[r.leaveType] || { bg: COLORS.purpleLight, fg: COLORS.purple };
              return (
                <div key={r.id} className="flex items-center gap-3 border-b border-[#EBEDF3] last:border-0 pb-2.5 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                    {r.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1E2333] truncate">{r.name}</div>
                    <div className="text-[11px] text-[#8A8FA3] truncate">
                      {r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`} · {r.days} ថ្ងៃ
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0"
                    style={{ background: lt.bg, color: lt.fg }}
                  >
                    {r.leaveType}
                  </span>
                  <span
                    className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0"
                    style={{ background: st.bg, color: st.fg }}
                  >
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
