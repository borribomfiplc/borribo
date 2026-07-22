import React, { useMemo, useState } from "react";
import { ArrowRightLeft, Building2, Briefcase, History, Network, Users } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, SelectField, TextField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";
import { createEmploymentAction } from "../services/employees";
import { todayISO } from "../utils/attendance";

const today = () => todayISO();

export default function OrganizationStructurePage({ employees = [], branches = [], departments = [], jobRoles = [], changes = [], profile }) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employeeId: employees[0]?.id || "", branch: "", dept: "", role: "", effectiveDate: today(), decisionNo: "", reason: "" });

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status !== "អសកម្ម"), [employees]);
  const activeBranches = branches.filter((item) => item.status !== "អសកម្ម");
  const activeDepartments = departments.filter((item) => item.status !== "អសកម្ម");
  const activeRoles = jobRoles.filter((item) => item.status !== "អសកម្ម");
  const selectedEmployee = employees.find((employee) => employee.id === form.employeeId);
  const roleOptions = activeRoles.filter((role) => !form.dept || role.dept === form.dept);

  const openTransfer = () => {
    const employee = employees[0];
    setForm({ employeeId: employee?.id || "", branch: employee?.branch || activeBranches[0]?.name || "", dept: employee?.dept || activeDepartments[0]?.name || "", role: employee?.role || activeRoles[0]?.name || "", effectiveDate: today(), decisionNo: "", reason: "" });
    setError(""); setShowTransfer(true);
  };

  const selectEmployee = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    setForm((current) => ({ ...current, employeeId, branch: employee?.branch || "", dept: employee?.dept || "", role: employee?.role || "" }));
  };

  const saveTransfer = async () => {
    if (saving) return;
    const employee = employees.find((item) => item.id === form.employeeId);
    if (!employee || !form.branch || !form.dept || !form.role || !form.effectiveDate || !form.decisionNo.trim() || !form.reason.trim()) {
      setError("សូមបំពេញបុគ្គលិក សាខា នាយកដ្ឋាន តួនាទី ថ្ងៃមានប្រសិទ្ធភាព លេខលិខិត និងមូលហេតុ"); return;
    }
    if (employee.branch === form.branch && employee.dept === form.dept && employee.role === form.role) {
      setError("សូមជ្រើសសាខា នាយកដ្ឋាន ឬតួនាទីថ្មីយ៉ាងតិចមួយ"); return;
    }
    setSaving(true); setError("");
    try {
      const branchChanged = employee.branch !== form.branch;
      const jobChanged = employee.dept !== form.dept || employee.role !== form.role;
      await createEmploymentAction(employee, {
        type: branchChanged && jobChanged ? "transfer_and_job_change" : branchChanged ? "transfer" : "job_change",
        effectiveDate: form.effectiveDate,
        branch: form.branch,
        branchId: branches.find((item) => item.name === form.branch)?.id || "",
        department: form.dept,
        departmentId: departments.find((item) => item.name === form.dept)?.id || "",
        role: form.role,
        roleId: jobRoles.find((item) => item.name === form.role)?.id || "",
        decisionNo: form.decisionNo.trim(),
        reason: form.reason.trim(),
        note: "បង្កើតពី Menu រចនាសម្ព័ន្ធអង្គភាព",
      });
      setShowTransfer(false);
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុកការផ្ទេរបុគ្គលិកបានទេ");
    } finally { setSaving(false); }
  };

  return <>
    <OrgHeader title="រចនាសម្ព័ន្ធអង្គភាព" sub="មើលសាខា នាយកដ្ឋាន តួនាទី និងប្រវត្តិផ្ទេរបុគ្គលិក" onAdd={openTransfer} addLabel="ផ្ទេរបុគ្គលិក" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {[
        [Building2, "សាខាសកម្ម", activeBranches.length, COLORS.primaryLight, COLORS.primary],
        [Briefcase, "នាយកដ្ឋាន", activeDepartments.length, COLORS.purpleLight, COLORS.purple],
        [Network, "តួនាទីការងារ", activeRoles.length, COLORS.amberLight, COLORS.accent],
        [Users, "បុគ្គលិកសកម្ម", activeEmployees.length, COLORS.greenLight, COLORS.green],
      ].map(([Icon, label, value, bg, color]) => <div key={label} className="rounded-2xl border border-[#EBEDF3] bg-white p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: bg }}><Icon size={17} color={color} /></div><div className="text-xl font-bold text-[#1E2333]">{value}</div><div className="mt-1 text-xs text-[#8A8FA3]">{label}</div></div>)}
    </div>

    <section className="rounded-2xl border border-[#EBEDF3] bg-white overflow-hidden mb-5">
      <div className="border-b border-[#EBEDF3] px-4 sm:px-5 py-4"><h2 className="font-semibold text-[#1E2333]">រចនាសម្ព័ន្ធតាមសាខា</h2><p className="text-xs text-[#8A8FA3] mt-1">បង្ហាញបុគ្គលិកសកម្ម និងនាយកដ្ឋានដែលមានក្នុងសាខានីមួយៗ</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 sm:p-4">
        {activeBranches.map((branch) => {
          const staff = activeEmployees.filter((employee) => employee.branch === branch.name);
          const deptCounts = Array.from(new Set(staff.map((employee) => employee.dept).filter(Boolean))).map((dept) => ({ dept, count: staff.filter((employee) => employee.dept === dept).length }));
          return <div key={branch.id} className="rounded-xl border border-[#EBEDF3] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-[#1E2333]">{branch.name}</div><div className="text-xs text-[#8A8FA3] mt-1">អ្នកគ្រប់គ្រង៖ {branch.manager || "មិនទាន់កំណត់"}</div></div><span className="rounded-full bg-[#EEF1FB] px-2.5 py-1 text-xs font-medium text-[#2A3F8F]">{staff.length} នាក់</span></div><div className="mt-3 flex flex-wrap gap-2">{deptCounts.length ? deptCounts.map((item) => <span key={item.dept} className="rounded-lg bg-[#F5F6FA] px-2.5 py-1.5 text-xs text-[#5B5F73]">{item.dept} · {item.count}</span>) : <span className="text-xs text-[#B4B7C6]">មិនទាន់មានបុគ្គលិក</span>}</div></div>;
        })}
      </div>
    </section>

    <section className="rounded-2xl border border-[#EBEDF3] bg-white overflow-hidden">
      <div className="border-b border-[#EBEDF3] px-4 sm:px-5 py-4 flex items-center gap-2"><History size={17} className="text-[#2A3F8F]" /><div><h2 className="font-semibold text-[#1E2333]">ប្រវត្តិផ្លាស់ប្ដូរអង្គភាព</h2><p className="text-xs text-[#8A8FA3] mt-1">Audit trail របស់ការផ្ទេរសាខា នាយកដ្ឋាន និងតួនាទី</p></div></div>
      <div className="divide-y divide-[#EBEDF3]">{changes.slice().sort((a, b) => String(b.createdAt || b.effectiveDate).localeCompare(String(a.createdAt || a.effectiveDate))).slice(0, 20).map((item) => <div key={item.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-medium text-sm text-[#1E2333]">{item.employeeName} <span className="font-normal text-[#8A8FA3]">({item.employeeId})</span></div><div className="text-xs text-[#5B5F73] mt-1">{item.oldValues?.branch || "—"} / {item.oldValues?.department || "—"} / {item.oldValues?.role || "—"} <ArrowRightLeft size={12} className="inline mx-1" /> {item.newValues?.branch || item.oldValues?.branch || "—"} / {item.newValues?.department || item.oldValues?.department || "—"} / {item.newValues?.role || item.oldValues?.role || "—"}</div><div className="text-xs text-[#8A8FA3] mt-1">មូលហេតុ៖ {item.reason} · លិខិត៖ {item.decisionNo || "—"}</div></div><div className="text-right text-xs text-[#8A8FA3]"><div>មានប្រសិទ្ធភាព៖ {item.effectiveDate}</div><div className="mt-1 font-medium text-[#2A3F8F]">{item.status || "បានអនុវត្ត"}</div></div></div></div>)}{!changes.length && <div className="py-10 text-center text-sm text-[#8A8FA3]">មិនទាន់មានប្រវត្តិផ្ទេរបុគ្គលិកទេ</div>}</div>
    </section>

    {showTransfer && <OrgModal title="ផ្ទេរបុគ្គលិក" onClose={() => setShowTransfer(false)} onSubmit={saveTransfer} submitLabel={saving ? "កំពុងរក្សាទុក..." : "រក្សាទុកការផ្ទេរ"} error={error}>
      <div><FieldLabel required>បុគ្គលិក</FieldLabel><SelectField options={employees.map((employee) => ({ value: employee.id, label: `${employee.id} · ${employee.name}` }))} value={form.employeeId} onChange={(event) => selectEmployee(event.target.value)} /></div>
      {selectedEmployee && <div className="rounded-xl bg-[#F5F6FA] px-3 py-2 text-xs text-[#5B5F73]">បច្ចុប្បន្ន៖ {selectedEmployee.branch} · {selectedEmployee.dept} · {selectedEmployee.role}</div>}
      <div><FieldLabel required>សាខាថ្មី</FieldLabel><SelectField options={activeBranches.map((item) => item.name)} value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value })} /></div>
      <div><FieldLabel required>នាយកដ្ឋានថ្មី</FieldLabel><SelectField options={activeDepartments.map((item) => item.name)} value={form.dept} onChange={(event) => { const dept = event.target.value; const firstRole = activeRoles.find((role) => role.dept === dept)?.name || ""; setForm({ ...form, dept, role: firstRole }); }} /></div>
      <div><FieldLabel required>តួនាទីថ្មី</FieldLabel><SelectField options={roleOptions.map((item) => item.name)} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} /></div>
      <div><FieldLabel required>ថ្ងៃមានប្រសិទ្ធភាព</FieldLabel><TextField type="date" value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} /></div>
      <div><FieldLabel required>លេខលិខិតសម្រេច</FieldLabel><TextField value={form.decisionNo} onChange={(event) => setForm({ ...form, decisionNo: event.target.value })} placeholder="ឧ. HR-2026-001" /></div>
      <div><FieldLabel required>មូលហេតុ</FieldLabel><textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="w-full resize-none rounded-xl bg-[#F5F6FA] px-4 py-2.5 text-sm outline-none" placeholder="ឧ. ផ្ទេរទៅបំពេញតម្រូវការបុគ្គលិកនៅសាខាថ្មី" /></div>
    </OrgModal>}
  </>;
}
