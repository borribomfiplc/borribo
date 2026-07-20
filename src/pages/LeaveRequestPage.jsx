import React, { useState } from "react";
import {
  ChevronDown, FileText, X, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { correctionStatusStyle, leaveTypeStyle, leaveTypes } from "../data/mockData";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import StatCard from "../components/shared/StatCard";

export default function LeaveRequestPage({ requests, setRequests, employees }) {
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    empId: employees[0].id,
    leaveType: leaveTypes[0],
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });
  const [error, setError] = useState("");

  const statuses = ["ទាំងអស់", "រង់ចាំពិនិត្យ", "បានអនុម័ត", "បានបដិសេធ"];
  const filtered = requests.filter((r) => statusFilter === "ទាំងអស់" || r.status === statusFilter);

  const counts = {
    pending: requests.filter((r) => r.status === "រង់ចាំពិនិត្យ").length,
    approved: requests.filter((r) => r.status === "បានអនុម័ត").length,
    rejected: requests.filter((r) => r.status === "បានបដិសេធ").length,
  };

  const decide = (id, decision) => {
    setRequests((list) => list.map((r) => (r.id === id ? { ...r, status: decision } : r)));
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.startDate.trim() || !form.endDate.trim() || !form.reason.trim()) {
      setError("សូមបំពេញកាលបរិច្ឆេទ និងហេតុផលនៃការស្នើសុំច្បាប់");
      return;
    }
    const emp = employees.find((e) => e.id === form.empId);
    const newRequest = {
      id: `LV-${String(requests.length + 1).padStart(3, "0")}`,
      empId: emp.id,
      name: emp.name,
      role: emp.role,
      branch: emp.branch,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      days: form.days ? Number(form.days) : 1,
      reason: form.reason,
      requestedBy: emp.name,
      requestedOn: "១៩ កក្កដា ២០២៦",
      status: "រង់ចាំពិនិត្យ",
    };
    setError("");
    setRequests((list) => [newRequest, ...list]);
    setForm({ empId: employees[0].id, leaveType: leaveTypes[0], startDate: "", endDate: "", days: "", reason: "" });
    setShowNew(false);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">សំណើសុំច្បាប់</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            គ្រប់គ្រងសំណើសុំច្បាប់ឈប់សម្រាករបស់បុគ្គលិកទាំងអស់
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
          style={{ background: COLORS.primary }}
        >
          <FileText size={16} />
          ស្នើសុំច្បាប់ថ្មី
        </button>
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

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-[#EBEDF3] p-3 sm:p-4 mb-5 flex items-center gap-3">
        <span className="text-xs text-[#8A8FA3] font-medium shrink-0">ត្រងតាមស្ថានភាព៖</span>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-[#F5F6FA] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 w-full sm:w-52"
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

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">បុគ្គលិក</th>
              <th className="text-right font-medium px-5 py-3">ប្រភេទច្បាប់</th>
              <th className="text-right font-medium px-5 py-3">រយៈពេល</th>
              <th className="text-right font-medium px-5 py-3">ហេតុផល</th>
              <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const st = correctionStatusStyle[r.status];
              const lt = leaveTypeStyle[r.leaveType];
              return (
                <tr key={r.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60 align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {r.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{r.name}</div>
                        <div className="text-xs text-[#B4B7C6]">{r.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-block"
                      style={{ background: lt.bg, color: lt.fg }}
                    >
                      {r.leaveType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73] whitespace-nowrap">
                    <div>{r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}</div>
                    <div className="text-[11px] text-[#8A8FA3] mt-0.5">{r.days} ថ្ងៃ</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73] max-w-[220px]">
                    <div className="text-xs leading-relaxed">{r.reason}</div>
                    <div className="text-[11px] text-[#B4B7C6] mt-1">ស្នើនៅថ្ងៃ៖ {r.requestedOn}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-block"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-left">
                    {r.status === "រង់ចាំពិនិត្យ" ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => decide(r.id, "បានអនុម័ត")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3FA66B] hover:bg-[#E9F7EF]"
                          title="អនុម័ត"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => decide(r.id, "បានបដិសេធ")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D9614F] hover:bg-[#FBEBE8]"
                          title="បដិសេធ"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#B4B7C6]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-[#8A8FA3] text-sm py-10">
                  មិនមានសំណើសុំច្បាប់ត្រូវនឹងលក្ខខណ្ឌនេះទេ
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map((r) => {
          const st = correctionStatusStyle[r.status];
          const lt = leaveTypeStyle[r.leaveType];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {r.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{r.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">{r.branch}</div>
                </div>
                <span
                  className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0"
                  style={{ background: st.bg, color: st.fg }}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-xs text-[#5B5F73] border-t border-[#EBEDF3] pt-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-medium rounded-full px-2.5 py-1 inline-block"
                    style={{ background: lt.bg, color: lt.fg }}
                  >
                    {r.leaveType}
                  </span>
                  <span className="text-[#8A8FA3]">{r.days} ថ្ងៃ</span>
                </div>
                <div className="mt-2">{r.startDate === r.endDate ? r.startDate : `${r.startDate} – ${r.endDate}`}</div>
                <div className="text-xs leading-relaxed mt-2">{r.reason}</div>
                <div className="text-[11px] text-[#B4B7C6] mt-1">ស្នើនៅថ្ងៃ៖ {r.requestedOn}</div>
              </div>
              {r.status === "រង់ចាំពិនិត្យ" && (
                <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[#EBEDF3]">
                  <button
                    onClick={() => decide(r.id, "បានអនុម័ត")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2"
                    style={{ background: COLORS.greenLight, color: COLORS.green }}
                  >
                    <CheckCircle2 size={14} /> អនុម័ត
                  </button>
                  <button
                    onClick={() => decide(r.id, "បានបដិសេធ")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2"
                    style={{ background: COLORS.redLight, color: COLORS.red }}
                  >
                    <XCircle size={14} /> បដិសេធ
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-[#8A8FA3] text-sm py-10 bg-white rounded-2xl border border-[#EBEDF3]">
            មិនមានសំណើសុំច្បាប់ត្រូវនឹងលក្ខខណ្ឌនេះទេ
          </div>
        )}
      </div>

      {/* New leave request modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#1E2333] text-lg">ស្នើសុំច្បាប់ថ្មី</h3>
              <button
                onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2 mb-3.5">{error}</div>
            )}

            <div className="flex flex-col gap-3.5">
              <div>
                <FieldLabel required>ជ្រើសរើសបុគ្គលិក</FieldLabel>
                <SelectField
                  options={employees.map((e) => e.id)}
                  value={form.empId}
                  onChange={update("empId")}
                />
                <p className="text-[11px] text-[#B4B7C6] mt-1.5">
                  {employees.find((e) => e.id === form.empId)?.name} · {employees.find((e) => e.id === form.empId)?.role}
                </p>
              </div>
              <div>
                <FieldLabel required>ប្រភេទច្បាប់</FieldLabel>
                <SelectField
                  options={leaveTypes}
                  value={form.leaveType}
                  onChange={update("leaveType")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>ថ្ងៃចាប់ផ្តើម</FieldLabel>
                  <TextField value={form.startDate} onChange={update("startDate")} placeholder="ឧ. ២០ កក្កដា ២០២៦" />
                </div>
                <div>
                  <FieldLabel required>ថ្ងៃបញ្ចប់</FieldLabel>
                  <TextField value={form.endDate} onChange={update("endDate")} placeholder="ឧ. ២១ កក្កដា ២០២៦" />
                </div>
              </div>
              <div>
                <FieldLabel>ចំនួនថ្ងៃ</FieldLabel>
                <TextField
                  dir="ltr"
                  type="number"
                  min="1"
                  value={form.days}
                  onChange={update("days")}
                  placeholder="1"
                />
              </div>
              <div>
                <FieldLabel required>ហេតុផលនៃការស្នើសុំច្បាប់</FieldLabel>
                <textarea
                  value={form.reason}
                  onChange={update("reason")}
                  rows={3}
                  placeholder="ពន្យល់ពីមូលហេតុនៃការស្នើសុំច្បាប់នេះ..."
                  className="w-full bg-[#F5F6FA] rounded-xl px-4 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#5B5F73]"
              >
                បោះបង់
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: COLORS.primary }}
              >
                ដាក់ស្នើសំណើ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
