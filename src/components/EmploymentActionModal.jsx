import React, { useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, FileText, Save, X } from "lucide-react";
import { FieldLabel, SelectField, TextField } from "./shared/FormFields";
import { COLORS } from "../data/theme";
import { createEmploymentAction } from "../services/employees";

const ACTIONS = [
  { value: "transfer", label: "ផ្ទេរសាខា" },
  { value: "promotion", label: "តម្លើងតួនាទី" },
  { value: "job_change", label: "ប្តូរតួនាទី/នាយកដ្ឋាន" },
  { value: "transfer_and_job_change", label: "ប្តូរសាខា និងតួនាទី" },
  { value: "resignation", label: "លាឈប់/បញ្ចប់ការងារ" },
];

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default function EmploymentActionModal({ employee, branches = [], departments = [], jobRoles = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    type: "transfer",
    effectiveDate: todayISO(),
    branch: employee.branch || "",
    department: employee.dept || "",
    role: employee.role || "",
    decisionNo: "",
    reason: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isResignation = form.type === "resignation";
  const includesTransfer = form.type === "transfer" || form.type === "transfer_and_job_change";
  const includesJob = form.type === "promotion" || form.type === "job_change" || form.type === "transfer_and_job_change";
  const availableRoles = useMemo(() => {
    const matching = jobRoles.filter((item) => !form.department || item.dept === form.department);
    return matching.length ? matching : jobRoles;
  }, [form.department, jobRoles]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updateDepartment = (event) => {
    const department = event.target.value;
    const roles = jobRoles.filter((item) => item.dept === department);
    setForm((current) => ({
      ...current,
      department,
      role: roles.some((item) => item.name === current.role) ? current.role : (roles[0]?.name || ""),
    }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.effectiveDate || !form.decisionNo.trim() || !form.reason.trim()) {
      setError("សូមបំពេញថ្ងៃមានប្រសិទ្ធភាព លេខលិខិតសម្រេច និងមូលហេតុ");
      return;
    }
    if (includesTransfer && (!form.branch || form.branch === employee.branch) && !includesJob) {
      setError("សូមជ្រើសសាខាថ្មីដែលខុសពីសាខាបច្ចុប្បន្ន");
      return;
    }
    if (includesJob && (!form.department || !form.role)) {
      setError("សូមជ្រើសនាយកដ្ឋាន និងតួនាទីថ្មី");
      return;
    }
    if (includesJob && form.department === employee.dept && form.role === employee.role && !includesTransfer) {
      setError("សូមជ្រើសនាយកដ្ឋាន ឬតួនាទីថ្មី");
      return;
    }
    setSaving(true); setError("");
    try {
      const result = await createEmploymentAction(employee, {
        type: form.type,
        effectiveDate: form.effectiveDate,
        branch: includesTransfer ? form.branch : employee.branch,
        department: includesJob ? form.department : employee.dept,
        role: includesJob ? form.role : employee.role,
        decisionNo: form.decisionNo.trim(),
        reason: form.reason.trim(),
        note: form.note.trim(),
      });
      onSaved?.(result);
      onClose();
    } catch (submitError) {
      setError(submitError?.message || "មិនអាចរក្សាទុកប្រតិបត្តិការបុគ្គលិកបានទេ");
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] bg-[#111827]/45 p-3 sm:p-6 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 bg-white flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#EBEDF3]">
        <div><h2 className="font-bold text-[#1E2333] flex items-center gap-2"><BriefcaseBusiness size={18} color={COLORS.primary} />ប្រតិបត្តិការបុគ្គលិក</h2><p className="text-xs text-[#8A8FA3] mt-1">{employee.name} · {employee.id}</p></div>
        <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-[#F5F6FA] flex items-center justify-center text-[#8A8FA3]" aria-label="បិទ"><X size={17} /></button>
      </div>
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {error && <div className="md:col-span-2 text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3">{error}</div>}
        <div className="md:col-span-2"><FieldLabel required>ប្រភេទប្រតិបត្តិការ</FieldLabel><SelectField options={ACTIONS} value={form.type} onChange={update("type")} /></div>
        <div><FieldLabel required>ថ្ងៃមានប្រសិទ្ធភាព</FieldLabel><TextField type="date" value={form.effectiveDate} onChange={update("effectiveDate")} /></div>
        <div><FieldLabel required>លេខលិខិតសម្រេច</FieldLabel><TextField icon={FileText} value={form.decisionNo} onChange={update("decisionNo")} placeholder="ឧ. HR-2026-001" /></div>

        {!isResignation && <>
          <div><FieldLabel>សាខាបច្ចុប្បន្ន</FieldLabel><TextField value={employee.branch || "—"} disabled /></div>
          <div><FieldLabel required={includesTransfer}>សាខាថ្មី</FieldLabel><SelectField options={branches.map((item) => item.name)} value={form.branch} onChange={update("branch")} disabled={!includesTransfer} /></div>
          <div><FieldLabel>នាយកដ្ឋានបច្ចុប្បន្ន</FieldLabel><TextField value={employee.dept || "—"} disabled /></div>
          <div><FieldLabel required={includesJob}>នាយកដ្ឋានថ្មី</FieldLabel><SelectField options={departments.map((item) => item.name)} value={form.department} onChange={updateDepartment} disabled={!includesJob} /></div>
          <div><FieldLabel>តួនាទីបច្ចុប្បន្ន</FieldLabel><TextField value={employee.role || "—"} disabled /></div>
          <div><FieldLabel required={includesJob}>តួនាទីថ្មី</FieldLabel><SelectField options={availableRoles.map((item) => item.name)} value={form.role} onChange={update("role")} disabled={!includesJob} /></div>
        </>}

        {isResignation && <div className="md:col-span-2 rounded-xl bg-[#FFF7ED] px-4 py-3 text-sm text-[#9A5B13] flex gap-2"><CalendarDays size={17} className="shrink-0 mt-0.5" /><span>នៅថ្ងៃមានប្រសិទ្ធភាព ស្ថានភាពនឹងប្តូរទៅ អសកម្ម និង Login Account នឹងត្រូវបិទដោយស្វ័យប្រវត្តិ។ ទិន្នន័យចាស់មិនត្រូវបានលុបទេ។</span></div>}
        <div className="md:col-span-2"><FieldLabel required>មូលហេតុ</FieldLabel><textarea value={form.reason} onChange={update("reason")} rows={3} placeholder="សរសេរមូលហេតុ..." className="w-full bg-[#F5F6FA] rounded-xl px-4 py-3 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 resize-y" /></div>
        <div className="md:col-span-2"><FieldLabel>កំណត់សម្គាល់បន្ថែម</FieldLabel><textarea value={form.note} onChange={update("note")} rows={2} className="w-full bg-[#F5F6FA] rounded-xl px-4 py-3 text-sm text-[#1E2333] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 resize-y" /></div>
      </div>
      <div className="sticky bottom-0 bg-white border-t border-[#EBEDF3] px-4 sm:px-6 py-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-[#EBEDF3] px-4 py-2.5 text-sm text-[#5B5F73]">បោះបង់</button>
        <button type="button" disabled={saving} onClick={handleSubmit} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60" style={{ background: COLORS.primary }}><Save size={16} />{saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកប្រតិបត្តិការ"}</button>
      </div>
    </div>
  </div>;
}
