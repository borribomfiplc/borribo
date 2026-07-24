import React, { useState } from "react";
import {
  ChevronDown, X, ArrowRight, Pencil, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { COLORS } from "../data/theme";
import { correctionStatusStyle } from "../data/mockData";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { usePagination } from "../hooks/usePagination";
import PaginationBar from "../components/shared/PaginationBar";
import StatCard from "../components/shared/StatCard";
import { isTime24, time24InputValue, todayISO } from "../utils/attendance";
import { createAttendanceCorrection, decideAttendanceCorrection } from "../services/attendance";

const formatKhmerDate = (dateISO) => new Intl.DateTimeFormat("km-KH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${dateISO}T00:00:00`));
export default function AttendanceCorrectionPage({ employees, attendanceToday, setAttendanceToday, attendanceHistory, setAttendanceHistory, corrections, setCorrections, profile }) {
  const [statusFilter, setStatusFilter] = useState("ទាំងអស់");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    empId: employees[0]?.id || "",
    date: todayISO(),
    checkIn: "",
    checkOut: "",
    status: "មានវត្តមាន",
    reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const statuses = ["ទាំងអស់", "រង់ចាំពិនិត្យ", "បានអនុម័ត", "បានបដិសេធ"];
  const filtered = corrections.filter((c) => statusFilter === "ទាំងអស់" || c.status === statusFilter);

  const { page, setPage, totalPages, totalItems, pageSize, pageItems: paged } = usePagination(filtered);

  const counts = {
    pending: corrections.filter((c) => c.status === "រង់ចាំពិនិត្យ").length,
    approved: corrections.filter((c) => c.status === "បានអនុម័ត").length,
    rejected: corrections.filter((c) => c.status === "បានបដិសេធ").length,
  };

  const decide = async (id, decision) => {
    const correction = corrections.find((item) => item.id === id);
    if (!correction || correction.status !== "រង់ចាំពិនិត្យ") return;
    const reviewComment = window.prompt(decision === "បានបដិសេធ" ? "សូមបញ្ចូលមូលហេតុបដិសេធ៖" : "មតិអ្នកអនុម័ត (បើមាន)៖", "");
    if (reviewComment === null) return;
    if (decision === "បានបដិសេធ" && !reviewComment.trim()) { setError("ត្រូវបញ្ចូលមូលហេតុបដិសេធ"); return; }
    setSaving(true); setError("");
    try {
      await decideAttendanceCorrection(id, decision === "បានអនុម័ត" ? "approve" : "reject", reviewComment.trim());
    } catch (decisionError) { setError(decisionError.message || "មិនអាចសម្រេចសំណើកែតម្រូវបានទេ"); }
    finally { setSaving(false); }
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.date || !form.reason.trim()) { setError("សូមបំពេញកាលបរិច្ឆេទ និងហេតុផលនៃការកែតម្រូវ"); return; }
    const noTime = ["អវត្តមាន", "ច្បាប់"].includes(form.status);
    if (!noTime && (!isTime24(form.checkIn) || !isTime24(form.checkOut))) { setError("សូមបញ្ចូលម៉ោងចូល និងម៉ោងចេញជា 24 ម៉ោង"); return; }
    if (!noTime && form.checkOut <= form.checkIn) { setError("ម៉ោងចេញត្រូវក្រោយម៉ោងចូល"); return; }
    const emp = employees.find((employee) => employee.id === form.empId);
    if (!emp) { setError("មិនមានបុគ្គលិកសម្រាប់បង្កើតសំណើកែតម្រូវទេ"); return; }
    setSaving(true); setError("");
    try {
      await createAttendanceCorrection({
        employeeId: emp.id,
        dateISO: form.date,
        newCheckIn: noTime ? "" : time24InputValue(form.checkIn),
        newCheckOut: noTime ? "" : time24InputValue(form.checkOut),
        newStatus: form.status,
        reason: form.reason.trim(),
      });
      setForm({ empId: employees[0]?.id || "", date: todayISO(), checkIn: "", checkOut: "", status: "មានវត្តមាន", reason: "" });
      setShowNew(false);
    } catch (submitError) { setError(submitError.message || "មិនអាចដាក់សំណើកែតម្រូវបានទេ"); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">កែតម្រូវវត្តមាន</h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            គ្រប់គ្រងសំណើកែតម្រូវម៉ោងចូល/ចេញ និងស្ថានភាពវត្តមានរបស់បុគ្គលិក
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-white text-xs sm:text-sm font-semibold rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap"
          style={{ background: COLORS.primary }}
        >
          <Pencil size={16} />
          សុំកែតម្រូវថ្មី
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
              <th className="text-right font-medium px-5 py-3">កាលបរិច្ឆេទ</th>
              <th className="text-right font-medium px-5 py-3">ដើម → ស្នើសុំ</th>
              <th className="text-right font-medium px-5 py-3">ហេតុផល</th>
              <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => {
              const st = correctionStatusStyle[c.status];
              return (
                <tr key={c.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60 align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {c.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{c.name}</div>
                        <div className="text-xs text-[#B4B7C6]">{c.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73] whitespace-nowrap">{c.date}</td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">
                    <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                      <span className="text-[#B4B7C6] line-through">{c.originalCheckIn}–{c.originalCheckOut}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs mt-0.5" dir="ltr">
                      <span className="text-[#1E2333] font-medium">{c.newCheckIn}–{c.newCheckOut}</span>
                    </div>
                    <div className="text-[11px] text-[#8A8FA3] mt-1">
                      {c.originalStatus} → <span className="text-[#1E2333] font-medium">{c.newStatus}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73] max-w-[220px]">
                    <div className="text-xs leading-relaxed">{c.reason}</div>
                    <div className="text-[11px] text-[#B4B7C6] mt-1">ស្នើដោយ៖ {c.requestedBy}</div>
                    {c.decisionReason && <div className="text-[11px] text-[#5B5F73] mt-1">មតិអ្នកសម្រេច៖ {c.decisionReason}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1 inline-block"
                      style={{ background: st.bg, color: st.fg }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-left">
                    {c.status === "រង់ចាំពិនិត្យ" ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => decide(c.id, "បានអនុម័ត")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3FA66B] hover:bg-[#E9F7EF]"
                          title="អនុម័ត"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => decide(c.id, "បានបដិសេធ")}
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
                  មិនមានសំណើកែតម្រូវត្រូវនឹងលក្ខខណ្ឌនេះទេ
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {paged.map((c) => {
          const st = correctionStatusStyle[c.status];
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-sm font-bold flex items-center justify-center shrink-0">
                  {c.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1E2333] text-sm truncate">{c.name}</div>
                  <div className="text-xs text-[#8A8FA3] truncate">{c.branch} · {c.date}</div>
                </div>
                <span
                  className="text-[11px] font-medium rounded-full px-2.5 py-1 shrink-0"
                  style={{ background: st.bg, color: st.fg }}
                >
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-[#5B5F73] border-t border-[#EBEDF3] pt-3">
                <div className="flex items-center gap-1.5" dir="ltr">
                  <span className="text-[#B4B7C6] line-through">{c.originalCheckIn}–{c.originalCheckOut}</span>
                  <ArrowRight size={11} className="text-[#B4B7C6] rotate-180" />
                  <span className="text-[#1E2333] font-medium">{c.newCheckIn}–{c.newCheckOut}</span>
                </div>
                <div className="text-[11px] text-[#8A8FA3] mt-1">
                  {c.originalStatus} → <span className="text-[#1E2333] font-medium">{c.newStatus}</span>
                </div>
                <div className="text-xs leading-relaxed mt-2">{c.reason}</div>
                <div className="text-[11px] text-[#B4B7C6] mt-1">ស្នើដោយ៖ {c.requestedBy}</div>
                {c.decisionReason && <div className="text-[11px] text-[#5B5F73] mt-1">មតិអ្នកសម្រេច៖ {c.decisionReason}</div>}
              </div>
              {c.status === "រង់ចាំពិនិត្យ" && (
                <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[#EBEDF3]">
                  <button
                    onClick={() => decide(c.id, "បានអនុម័ត")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl py-2"
                    style={{ background: COLORS.greenLight, color: COLORS.green }}
                  >
                    <CheckCircle2 size={14} /> អនុម័ត
                  </button>
                  <button
                    onClick={() => decide(c.id, "បានបដិសេធ")}
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
            មិនមានសំណើកែតម្រូវត្រូវនឹងលក្ខខណ្ឌនេះទេ
          </div>
        )}
      </div>
      <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />

      {/* New correction modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92dvh] overflow-hidden flex flex-col">
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-4 sm:p-5 border-b border-[#EBEDF3]">
              <h3 className="font-bold text-[#1E2333] text-lg">សុំកែតម្រូវវត្តមាន</h3>
              <button
                onClick={() => setShowNew(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                <FieldLabel required>កាលបរិច្ឆេទត្រូវកែតម្រូវ</FieldLabel>
                <TextField type="date" dir="ltr" value={form.date} onChange={update("date")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>ម៉ោងចូល (ស្នើសុំថ្មី)</FieldLabel>
                  <TextField type="time" dir="ltr" value={form.checkIn} onChange={update("checkIn")} placeholder="08:00" />
                </div>
                <div>
                  <FieldLabel>ម៉ោងចេញ (ស្នើសុំថ្មី)</FieldLabel>
                  <TextField type="time" dir="ltr" value={form.checkOut} onChange={update("checkOut")} placeholder="17:00" />
                </div>
              </div>
              <div>
                <FieldLabel>ស្ថានភាពថ្មី</FieldLabel>
                <SelectField
                  options={["មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"]}
                  value={form.status}
                  onChange={update("status")}
                />
              </div>
              <div>
                <FieldLabel required>ហេតុផលនៃការកែតម្រូវ</FieldLabel>
                <textarea
                  value={form.reason}
                  onChange={update("reason")}
                  rows={3}
                  placeholder="ពន្យល់ពីមូលហេតុនៃការស្នើសុំកែតម្រូវនេះ..."
                  className="w-full bg-[#F5F6FA] rounded-xl px-4 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white flex gap-3 mt-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] border-t border-[#EBEDF3]">
              <button
                onClick={() => setShowNew(false)}
                className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm font-medium text-[#5B5F73]"
              >
                បោះបង់
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
                style={{ background: COLORS.primary }}
              >
                {saving ? "កំពុងដាក់ស្នើ..." : "ដាក់ស្នើសំណើ"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
