import React, { useMemo, useState } from "react";
import { Building2, Power, MapPin, Phone, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

const statusConfig = {
  "មានវត្តមាន": { label: "មានវត្តមាន", color: COLORS.green, icon: CheckCircle2 },
  "យឺត": { label: "យឺត", color: COLORS.accent, icon: AlertCircle },
  "អវត្តមាន": { label: "អវត្តមាន", color: COLORS.red, icon: XCircle },
  "ច្បាប់": { label: "ច្បាប់", color: COLORS.purple, icon: AlertCircle },
};

export default function BranchPage({ employees, branches, setBranches, attendanceHistory }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", type: "សាខា", address: "", manager: "", phone: "", status: "សកម្ម" });
  const [error, setError] = useState("");

  const latestDates = useMemo(() => [...new Set(attendanceHistory.map((item) => item.dateISO).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a)).slice(0, 5), [attendanceHistory]);

  const branchSummaries = useMemo(() => branches.map((branch) => {
    const records = attendanceHistory.filter((record) => record.branch === branch.name && latestDates.includes(record.dateISO));
    const counts = Object.fromEntries(Object.keys(statusConfig).map((status) => [status, records.filter((record) => record.status === status).length]));
    const attended = counts["មានវត្តមាន"] + counts["យឺត"];
    return {
      branch,
      staff: employees.filter((employee) => employee.branch === branch.name).length,
      records: records.length,
      counts,
      rate: records.length ? Math.round((attended / records.length) * 100) : 0,
    };
  }), [branches, employees, attendanceHistory, latestDates]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.manager.trim()) {
      setError("សូមបំពេញឈ្មោះសាខា និងអ្នកគ្រប់គ្រង");
      return;
    }
    setBranches((list) => [{ id: `BR-${String(list.length + 1).padStart(3, "0")}`, ...form }, ...list]);
    setError("");
    setForm({ name: "", type: "សាខា", address: "", manager: "", phone: "", status: "សកម្ម" });
    setShowNew(false);
  };

  const toggleStatus = (id) => setBranches((list) => list.map((branch) => branch.id === id ? { ...branch, status: branch.status === "អសកម្ម" ? "សកម្ម" : "អសកម្ម" } : branch));

  return (
    <>
      <OrgHeader title="សាខា" sub={`សង្ខេបវត្តមានតាមសាខា ${latestDates.length || 0} ថ្ងៃចុងក្រោយ`} onAdd={() => setShowNew(true)} addLabel="បន្ថែមសាខា" />

      <div className="mb-5 rounded-2xl border border-[#EBEDF3] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EBEDF3] flex flex-wrap gap-2 items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#1E2333] text-[15px]">សង្ខេបតាមសាខា (៥ថ្ងៃចុងក្រោយ)</h2>
            <p className="text-xs text-[#8A8FA3] mt-1">គណនាពីប្រវត្តិវត្តមានដែលបានកត់ត្រា</p>
          </div>
          <span className="text-xs rounded-full px-3 py-1.5" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
            {latestDates.length ? `${latestDates.length} ថ្ងៃ` : "មិនទាន់មានទិន្នន័យ"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">សាខា</th><th className="text-center font-medium px-4 py-3">បុគ្គលិក</th><th className="text-center font-medium px-4 py-3">មានវត្តមាន</th><th className="text-center font-medium px-4 py-3">យឺត</th><th className="text-center font-medium px-4 py-3">អវត្តមាន</th><th className="text-center font-medium px-4 py-3">ច្បាប់</th><th className="text-left font-medium px-5 py-3">អត្រាវត្តមាន</th>
            </tr></thead>
            <tbody>{branchSummaries.map(({ branch, staff, records, counts, rate }) => (
              <tr key={branch.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60">
                <td className="px-5 py-3.5"><div className="font-medium text-[#1E2333]">{branch.name}</div><div className="text-xs text-[#8A8FA3]">{branch.type}</div></td>
                <td className="px-4 py-3.5 text-center text-[#5B5F73]">{staff}</td>
                {["មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"].map((status) => <td key={status} className="px-4 py-3.5 text-center"><span className="font-semibold" style={{ color: statusConfig[status].color }}>{counts[status]}</span></td>)}
                <td className="px-5 py-3.5 text-left"><div className="flex items-center justify-start gap-2"><div className="w-20 h-2 rounded-full bg-[#EEF1FB] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate >= 90 ? COLORS.green : rate >= 75 ? COLORS.accent : COLORS.red }} /></div><span className="font-semibold text-[#1E2333]">{records ? `${rate}%` : "—"}</span></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchSummaries.map(({ branch, staff, rate }) => (
          <div key={branch.id} className={`bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3 ${branch.status === "អសកម្ម" ? "opacity-65" : ""}`}>
            <div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: COLORS.primaryLight }}><Building2 size={20} color={COLORS.primary} /></div><div><div className="font-semibold text-[#1E2333] text-sm">{branch.name}</div><div className="text-xs text-[#8A8FA3]">{branch.type} · {branch.status || "សកម្ម"}</div></div></div><button onClick={() => toggleStatus(branch.id)} aria-label={`${branch.status === "អសកម្ម" ? "បើក" : "បិទ"} ${branch.name}`} className={`w-8 h-8 rounded-lg flex items-center justify-center ${branch.status === "អសកម្ម" ? "bg-[#E9F7EF] text-[#3FA66B]" : "text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F]"}`}><Power size={15} /></button></div>
            {branch.address && <div className="flex items-start gap-2 text-xs text-[#5B5F73]"><MapPin size={13} className="text-[#B4B7C6] mt-0.5 shrink-0" /><span>{branch.address}</span></div>}
            <div className="flex items-center justify-between border-t border-[#EBEDF3] pt-3 mt-1"><div className="text-xs text-[#8A8FA3]">អ្នកគ្រប់គ្រង៖ <span className="text-[#1E2333] font-medium">{branch.manager}</span></div><span className="text-[11px] font-medium rounded-full px-2.5 py-1" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{staff} បុគ្គលិក</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#8A8FA3]">អត្រាវត្តមាន ៥ថ្ងៃ</span><span className="font-semibold" style={{ color: rate >= 90 ? COLORS.green : COLORS.accent }}>{rate}%</span></div>
          </div>
        ))}
      </div>

      {showNew && <OrgModal title="បន្ថែមសាខាថ្មី" onClose={() => setShowNew(false)} onSubmit={handleSubmit} submitLabel="រក្សាទុកសាខា" error={error}>
        <div><FieldLabel required>ឈ្មោះសាខា</FieldLabel><TextField value={form.name} onChange={update("name")} placeholder="ឧ. សាខាចំការមន" /></div>
        <div><FieldLabel>ប្រភេទ</FieldLabel><SelectField options={["ការិយាល័យកណ្តាល", "សាខា"]} value={form.type} onChange={update("type")} /></div>
        <div><FieldLabel>អាសយដ្ឋាន</FieldLabel><TextField icon={MapPin} value={form.address} onChange={update("address")} placeholder="ផ្លូវ, សង្កាត់, ខណ្ឌ, ក្រុង" /></div>
        <div><FieldLabel required>អ្នកគ្រប់គ្រងសាខា</FieldLabel><TextField value={form.manager} onChange={update("manager")} placeholder="ឈ្មោះអ្នកគ្រប់គ្រង" /></div>
        <div><FieldLabel>លេខទូរស័ព្ទ</FieldLabel><TextField icon={Phone} dir="ltr" value={form.phone} onChange={update("phone")} placeholder="0XX XXX XXX" /></div>
      </OrgModal>}
    </>
  );
}
