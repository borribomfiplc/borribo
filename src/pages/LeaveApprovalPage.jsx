import React, { useState } from "react";
import {
  ChevronDown, CheckCircle2, XCircle, AlertCircle, Download, X, FileCheck2, FileWarning
} from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { COLORS } from "../data/theme";
import { correctionStatusStyle, leaveQuotas, leaveTypeStyle, leaveTypes } from "../data/mockData";
import StatCard from "../components/shared/StatCard";
import { notifyTelegram } from "../services/telegram";
import { db } from "../firebase/config";
import { leaveAttendanceRecord, remainingLeaveDays, requestLeaveDaysForYear, workingLeaveDates } from "../utils/leave";
import { downloadLeaveAttachment } from "../services/leaveAttachments";
import { todayISO } from "../utils/attendance";
import { secureCollectionMutation } from "../services/secureWrites";

export default function LeaveApprovalPage({ requests, employees, profile, holidays = [] }) {
  const [branchFilter, setBranchFilter] = useState("គ្រប់សាខា");
  const [typeFilter, setTypeFilter] = useState("គ្រប់ប្រភេទ");
  const [showHistory, setShowHistory] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const openDecision = (request, status) => {
    setDecision({ request, status }); setDecisionReason(""); setError("");
  };

  const toggleDocumentReceipt = async (request) => {
    const received = request.documentReceiptStatus === "បានទទួល";
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "leaveRequests", request.id), {
        documentReceiptStatus: received ? "មិនទាន់ទទួល" : "បានទទួល",
        documentReceiptUpdatedAt: serverTimestamp(),
        documentReceiptUpdatedBy: profile?.uid || "",
        documentReceiptUpdatedByName: profile?.name || "HR/Admin",
      });
    } catch (receiptError) {
      setError(receiptError.message || "មិនអាចកែស្ថានភាពឯកសារបានទេ");
    } finally { setSaving(false); }
  };

  const confirmDecision = async () => {
    if (!decision) return;
    const { request, status } = decision;
    if (status === "បានបដិសេធ" && !decisionReason.trim()) {
      setError("សូមបញ្ចូលមូលហេតុបដិសេធ"); return;
    }
    const employeeId = request.employeeId || request.empId;
    const leaveDates = workingLeaveDates(request.startDate, request.endDate, holidays);
    const authoritativeDays = requestLeaveDaysForYear(request, "", holidays);
    if (status === "បានអនុម័ត" && !leaveDates.length) {
      setError("ចន្លោះថ្ងៃនេះមិនមានថ្ងៃធ្វើការទេ"); return;
    }
    if (status === "បានអនុម័ត" && leaveQuotas[request.leaveType] > 0) {
      const years = [...new Set(leaveDates.map((dateISO) => dateISO.slice(0, 4)))];
      for (const year of years) {
        const requested = requestLeaveDaysForYear(request, year, holidays);
        const remaining = remainingLeaveDays(requests, employeeId, request.leaveType, { year, holidays, excludedId: request.id });
        if (remaining != null && requested > remaining) {
          setError(`សមតុល្យ ${request.leaveType} ឆ្នាំ ${year} នៅសល់តែ ${remaining} ថ្ងៃ`); return;
        }
      }
    }
    setSaving(true); setError("");
    try {
      const actor = { uid: profile?.uid || "", name: profile?.name || "HR/Admin" };
      await updateDoc(doc(db, "leaveRequests", request.id), {
        status, decisionReason: decisionReason.trim(), decidedOn: todayISO(),
        decidedAt: serverTimestamp(), decidedBy: actor.uid, decidedByName: actor.name,
        ...(status === "បានអនុម័ត" ? { days: authoritativeDays, workingDates: leaveDates, leaveYear: request.startDate.slice(0, 4) } : {}),
      });
      if (status === "បានអនុម័ត" && (!request.portion || request.portion === "ពេញថ្ងៃ")) {
        const employee = employees.find((item) => item.id === employeeId);
        const now = new Date().toISOString();
        const historyUpserts = leaveDates.map((dateISO) => {
          const record = { ...leaveAttendanceRecord(request, employee, dateISO, actor), updatedAt: now };
          return { id: record.docId, data: record };
        });
        if (historyUpserts.length) await secureCollectionMutation("attendanceHistory", historyUpserts, []);
        const todayRecord = historyUpserts.find((row) => row.data.dateISO === todayISO());
        if (todayRecord) await secureCollectionMutation("attendanceToday", [{ id: todayRecord.data.recordId, data: todayRecord.data }], []);
      }
      await notifyTelegram("leave_decision", request.id);
      setDecision(null);
    } catch (decisionError) { setError(decisionError.message || "មិនអាចរក្សាទុកការសម្រេចបានទេ"); }
    finally { setSaving(false); }
  };

  const downloadAttachment = async (attachment) => {
    try { await downloadLeaveAttachment(attachment); }
    catch { setError("មិនអាចទាញយកឯកសារភ្ជាប់បានទេ"); }
  };

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">អនុម័តច្បាប់</h1>
        <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
          ពិនិត្យ និងសម្រេចលើសំណើសុំច្បាប់ដែលកំពុងរង់ចាំការអនុម័ត
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#EEF1FB] px-3 py-1.5 text-xs font-medium text-[#2A3F8F]">បុគ្គលិក <span>→</span> HR/Admin</div>
      </div>

      {error && !decision && <div className="mb-4 rounded-xl bg-[#FBEBE8] px-4 py-3 text-sm text-[#D9614F]">{error}</div>}

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
                  {r.attachment && <button type="button" onClick={() => downloadAttachment(r.attachment)} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#2A3F8F]"><Download size={14} /> {r.attachment.name}</button>}
                  {r.documentRequired && <button disabled={saving} type="button" onClick={() => toggleDocumentReceipt(r)} className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-60 ${r.documentReceiptStatus === "បានទទួល" ? "bg-[#E9F7EF] text-[#3FA66B]" : "bg-[#FDF3E3] text-[#B97913]"}`}>{r.documentReceiptStatus === "បានទទួល" ? <FileCheck2 size={15} /> : <FileWarning size={15} />}{r.documentReceiptStatus === "បានទទួល" ? "បានទទួលលិខិតពេទ្យ · ចុចដើម្បីប្ដូរ" : "មិនទាន់ទទួលលិខិតពេទ្យ · ចុចពេលបានទទួល"}</button>}
                </div>

                <div className="flex items-center gap-2.5 mt-4">
                  <button
                    onClick={() => openDecision(r, "បានអនុម័ត")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold rounded-xl py-2.5"
                    style={{ background: COLORS.greenLight, color: COLORS.green }}
                  >
                    <CheckCircle2 size={16} /> អនុម័ត
                  </button>
                  <button
                    onClick={() => openDecision(r, "បានបដិសេធ")}
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
                    {r.decisionReason && <div className="text-[11px] text-[#5B5F73] truncate">មតិ៖ {r.decisionReason}</div>}
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

      {decision && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-bold text-[#1E2333]">{decision.status === "បានអនុម័ត" ? "បញ្ជាក់ការអនុម័ត" : "បញ្ជាក់ការបដិសេធ"}</h3><p className="text-xs text-[#8A8FA3] mt-1">{decision.request.name} · {decision.request.days} ថ្ងៃ</p></div><button onClick={() => setDecision(null)} className="w-8 h-8 rounded-lg hover:bg-[#F5F6FA] flex items-center justify-center"><X size={18} /></button></div><label className="text-sm text-[#5B5F73]">{decision.status === "បានបដិសេធ" ? "មូលហេតុបដិសេធ *" : "កំណត់ចំណាំ (បើមាន)"}<textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" placeholder="បញ្ចូលមតិរបស់ HR/Admin..." /></label>{error && <p className="mt-3 rounded-xl bg-[#FBEBE8] px-3 py-2 text-sm text-[#D9614F]">{error}</p>}<div className="flex gap-2 mt-5"><button disabled={saving} onClick={() => setDecision(null)} className="flex-1 border border-[#EBEDF3] rounded-xl py-2.5 text-sm">បោះបង់</button><button disabled={saving} onClick={confirmDecision} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: decision.status === "បានអនុម័ត" ? COLORS.green : COLORS.red }}>{saving ? "កំពុងរក្សាទុក..." : decision.status === "បានអនុម័ត" ? "អនុម័ត" : "បដិសេធ"}</button></div></div></div>}
    </>
  );
}
