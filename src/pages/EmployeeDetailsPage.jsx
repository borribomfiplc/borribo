import React, { useState } from "react";
import { ArrowLeft, Briefcase, CalendarDays, FileClock, FileText, Mail, MapPin, Pencil, Phone, Shield, User, XCircle } from "lucide-react";
import { COLORS } from "../data/theme";
import AccountProvisionModal from "../components/AccountProvisionModal";
import { cancelEmploymentAction } from "../services/employees";
import { isEmployeeInactive, normalizeEmployeeStatus } from "../utils/employeeStatus";

function Item({ icon: Icon, label, value, dir }) {
  return <div className="flex gap-3 rounded-xl bg-[#F7F8FB] p-3.5"><Icon size={17} className="text-[#8A8FA3] shrink-0 mt-0.5" /><div className="min-w-0"><div className="text-[11px] text-[#8A8FA3]">{label}</div><div dir={dir} className="text-sm font-medium text-[#1E2333] mt-1 break-words">{value || "—"}</div></div></div>;
}

const ACTION_LABELS = {
  transfer: "ផ្ទេរសាខា",
  promotion: "តម្លើងតួនាទី",
  job_change: "ប្តូរតួនាទី/នាយកដ្ឋាន",
  transfer_and_job_change: "ប្តូរសាខា និងតួនាទី",
  resignation: "លាឈប់/បញ្ចប់ការងារ",
};

function EmploymentHistory({ items, onCancel }) {
  const [canceling, setCanceling] = useState("");
  const [error, setError] = useState("");
  const cancel = async (item) => {
    if (!window.confirm(`តើអ្នកចង់លុបចោលប្រតិបត្តិការ "${ACTION_LABELS[item.type]}" មែនទេ?`)) return;
    setCanceling(item.id); setError("");
    try { await onCancel(item.id); }
    catch (cancelError) { setError(cancelError?.message || "មិនអាចលុបចោលបានទេ"); }
    finally { setCanceling(""); }
  };
  return <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5">
    <h3 className="font-semibold text-[#1E2333] mb-1 flex items-center gap-2"><FileClock size={18} color={COLORS.primary} />ប្រវត្តិការងារ</h3>
    <p className="text-xs text-[#8A8FA3] mb-4">ប្រវត្តិប្តូរសាខា តួនាទី និងការបញ្ចប់ការងារ</p>
    {error && <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3 mb-3">{error}</div>}
    {!items.length ? <div className="rounded-xl bg-[#F7F8FB] px-4 py-8 text-center text-sm text-[#8A8FA3]">មិនទាន់មានប្រវត្តិការងារទេ</div> : <div className="space-y-3">
      {items.map((item) => {
        const oldValue = item.oldValues || {};
        const nextValue = item.newValues || {};
        const scheduled = item.status === "បានកំណត់";
        return <div key={item.id} className="rounded-xl border border-[#EBEDF3] p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="text-sm font-semibold text-[#1E2333]">{ACTION_LABELS[item.type] || item.type}</div><div className="text-xs text-[#8A8FA3] mt-1">មានប្រសិទ្ធភាព៖ {item.effectiveDate} · លិខិត៖ {item.decisionNo}</div></div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.status === "បានអនុវត្ត" ? "bg-[#E9F7EF] text-[#257C4B]" : item.status === "បានលុបចោល" ? "bg-[#F2F3F6] text-[#73778A]" : item.status === "បរាជ័យ" ? "bg-[#FBEBE8] text-[#B84637]" : "bg-[#FFF4DD] text-[#9A6815]"}`}>{item.status}</span>
          </div>
          {item.type !== "resignation" && <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
            {(oldValue.branch !== nextValue.branch) && <div className="rounded-lg bg-[#F7F8FB] px-3 py-2"><span className="text-[#8A8FA3]">សាខា៖</span> {oldValue.branch || "—"} → <b>{nextValue.branch || "—"}</b></div>}
            {(oldValue.department !== nextValue.department) && <div className="rounded-lg bg-[#F7F8FB] px-3 py-2"><span className="text-[#8A8FA3]">នាយកដ្ឋាន៖</span> {oldValue.department || "—"} → <b>{nextValue.department || "—"}</b></div>}
            {(oldValue.role !== nextValue.role) && <div className="rounded-lg bg-[#F7F8FB] px-3 py-2"><span className="text-[#8A8FA3]">តួនាទី៖</span> {oldValue.role || "—"} → <b>{nextValue.role || "—"}</b></div>}
          </div>}
          <div className="text-xs text-[#5B5F73] mt-3"><span className="text-[#8A8FA3]">មូលហេតុ៖</span> {item.reason}</div>
          {item.note && <div className="text-xs text-[#5B5F73] mt-1"><span className="text-[#8A8FA3]">សម្គាល់៖</span> {item.note}</div>}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#EBEDF3] text-[11px] text-[#8A8FA3]"><span>កត់ត្រាដោយ {item.createdByEmail || "—"} · {String(item.createdAt || "").slice(0, 16).replace("T", " ")}</span>{scheduled && <button type="button" disabled={canceling === item.id} onClick={() => cancel(item)} className="text-[#D9614F] flex items-center gap-1 font-medium disabled:opacity-50"><XCircle size={13} />{canceling === item.id ? "កំពុងលុបចោល..." : "លុបចោល"}</button>}</div>
          {item.error && <div className="text-xs text-[#D9614F] mt-2">{item.error}</div>}
        </div>;
      })}
    </div>}
  </section>;
}

export default function EmployeeDetailsPage({ employee, employees = [], onBack, onEdit, employmentActions = [], branches = [], departments = [], jobRoles = [], actorRole = "hr" }) {
  const [showAccount, setShowAccount] = useState(false);
  const [message, setMessage] = useState("");
  if (!employee) return null;
  const history = employmentActions
    .filter((item) => item.employeeId === employee.id)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const directManager = employees.find((item) => item.id === employee.managerId);
  const employeeStatus = normalizeEmployeeStatus(employee.status);
  return <>
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div><button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#8A8FA3] hover:text-[#2A3F8F] mb-2"><ArrowLeft size={14} /> ត្រឡប់ទៅបញ្ជី</button><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">ព័ត៌មានបុគ្គលិកលម្អិត</h1></div>
      <button onClick={() => onEdit(employee)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-white text-sm font-semibold" style={{ background: COLORS.primary }}><Pencil size={15} /> កែសម្រួលព័ត៌មានបុគ្គលិក</button>
    </div>
    {message && <div className="text-sm text-[#3FA66B] bg-[#E9F7EF] rounded-xl px-4 py-3 mb-5">{message}</div>}
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <aside className="bg-white rounded-2xl border border-[#EBEDF3] p-5 text-center h-fit">
        {employee.photo ? <img src={employee.photo} alt={employee.name} className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-[#EEF1FB]" /> : <div className="w-28 h-28 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-4xl font-bold flex items-center justify-center mx-auto">{employee.name?.slice(0, 1)}</div>}
        <h2 className="font-bold text-[#1E2333] mt-4">{employee.name}</h2><p className="text-sm text-[#8A8FA3] mt-1">{employee.role}</p>
        <span className={`inline-block mt-3 text-xs font-medium rounded-full px-3 py-1 ${isEmployeeInactive(employee.status) ? "bg-[#F1F2F6] text-[#8A8FA3]" : employeeStatus === "ឈប់សម្រាក" ? "bg-[#FDF3E3] text-[#B97913]" : "bg-[#E9F7EF] text-[#3FA66B]"}`}>{employeeStatus}</span>
        <div className="border-t border-[#EBEDF3] mt-5 pt-4 text-xs text-[#8A8FA3]">លេខសម្គាល់<div className="text-base font-bold text-[#2A3F8F] mt-1" dir="ltr">{employee.id}</div></div>
      </aside>
      <div className="flex flex-col gap-5">
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><h3 className="font-semibold text-[#1E2333] mb-4 flex items-center gap-2"><User size={18} color={COLORS.primary} />ព័ត៌មានផ្ទាល់ខ្លួន</h3><div className="grid sm:grid-cols-2 gap-3"><Item icon={Phone} label="លេខទូរស័ព្ទ" value={employee.phone} dir="ltr" /><Item icon={Mail} label="អ៊ីមែល" value={employee.email} dir="ltr" /><Item icon={CalendarDays} label="ថ្ងៃខែឆ្នាំកំណើត" value={employee.dob} /><Item icon={User} label="ភេទ" value={employee.gender} /><div className="sm:col-span-2"><Item icon={MapPin} label="អាសយដ្ឋាន" value={employee.address} /></div><Item icon={User} label="ទំនាក់ទំនងបន្ទាន់" value={employee.emergencyName} /><Item icon={Phone} label="លេខទូរស័ព្ទបន្ទាន់" value={employee.emergencyPhone} dir="ltr" /><Item icon={User} label="ត្រូវជា" value={employee.emergencyRelation} /></div></section>
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><h3 className="font-semibold text-[#1E2333] mb-4 flex items-center gap-2"><Briefcase size={18} color={COLORS.primary} />ព័ត៌មានការងារ</h3><div className="grid sm:grid-cols-2 gap-3"><Item icon={Briefcase} label="នាយកដ្ឋាន" value={employee.dept} /><Item icon={Briefcase} label="តួនាទី" value={employee.role} /><Item icon={MapPin} label="សាខា" value={employee.branch} /><Item icon={User} label="អ្នកគ្រប់គ្រងផ្ទាល់" value={directManager ? `${directManager.id} · ${directManager.name}` : "មិនទាន់កំណត់"} /><Item icon={CalendarDays} label="ថ្ងៃចូលបម្រើការងារ" value={employee.startDate} /><Item icon={Briefcase} label="ប្រភេទការងារ" value={employee.employmentType} /><Item icon={CalendarDays} label="វេនការងារ" value={employee.shift} /></div></section>
        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5"><div className="flex items-center justify-between gap-3 flex-wrap"><div><h3 className="font-semibold text-[#1E2333] mb-2 flex items-center gap-2"><Shield size={18} color={COLORS.primary} />ស្ថានភាពគណនី</h3><p className="text-sm text-[#5B5F73]">{employee.uid ? `បានភ្ជាប់ Login Account (${employee.accountRole || "employee"})` : "មិនទាន់មាន Login Account"}</p></div>{!employee.uid && !isEmployeeInactive(employee.status) && <button type="button" onClick={() => setShowAccount(true)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white" style={{ background: COLORS.primary }}>បង្កើត Login Account</button>}</div></section>
        <EmploymentHistory items={history} onCancel={cancelEmploymentAction} />
      </div>
    </div>
    {showAccount && <AccountProvisionModal employee={employee} actorRole={actorRole} onClose={() => setShowAccount(false)} onSaved={() => setMessage("បានបង្កើត Login Account ជោគជ័យ។")} />}
  </>;
}
