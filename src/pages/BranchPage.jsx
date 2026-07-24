import React, { useMemo, useState } from "react";
import { Building2, Power, MapPin, Phone, CheckCircle2, AlertCircle, XCircle, Pencil } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";
import { saveBranch, toggleBranchStatus } from "../services/organization";

const emptyBranchForm = {
  name: "", type: "សាខា", address: "", manager: "", phone: "", status: "សកម្ម",
  latitude: "", longitude: "", gpsRadiusMeters: "100",
};

const branchForm = (branch = {}) => ({
  ...emptyBranchForm,
  name: branch.name || "",
  type: branch.type || "សាខា",
  address: branch.address || "",
  manager: branch.manager || "",
  phone: branch.phone || "",
  status: branch.status || "សកម្ម",
  latitude: branch.latitude ?? "",
  longitude: branch.longitude ?? "",
  gpsRadiusMeters: String(branch.gpsRadiusMeters || 100),
});

const statusConfig = {
  "មានវត្តមាន": { label: "មានវត្តមាន", color: COLORS.green, icon: CheckCircle2 },
  "យឺត": { label: "យឺត", color: COLORS.accent, icon: AlertCircle },
  "អវត្តមាន": { label: "អវត្តមាន", color: COLORS.red, icon: XCircle },
  "ច្បាប់": { label: "ច្បាប់", color: COLORS.purple, icon: AlertCircle },
};

export default function BranchPage({ employees, setEmployees, branches, setBranches, attendanceHistory }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyBranchForm);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const latestDates = useMemo(() => [...new Set(attendanceHistory.map((item) => item.dateISO).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a)).slice(0, 5), [attendanceHistory]);

  const branchSummaries = useMemo(() => branches.map((branch) => {
    const records = attendanceHistory.filter((record) => record.branch === branch.name && latestDates.includes(record.dateISO));
    const counts = Object.fromEntries(Object.keys(statusConfig).map((status) => [status, records.filter((record) => status === "ច្បាប់" ? ["ច្បាប់", "ច្បាប់កន្លះថ្ងៃ"].includes(record.status) : record.status === status).length]));
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

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.manager.trim()) { setError("សូមបំពេញឈ្មោះសាខា និងអ្នកគ្រប់គ្រង"); return; }
    const hasLatitude = String(form.latitude).trim() !== "";
    const hasLongitude = String(form.longitude).trim() !== "";
    if (hasLatitude !== hasLongitude) { setError("សូមបំពេញ Latitude និង Longitude ទាំងពីរ"); return; }
    const latitude = hasLatitude ? Number(form.latitude) : "";
    const longitude = hasLongitude ? Number(form.longitude) : "";
    const gpsRadiusMeters = Number(form.gpsRadiusMeters);
    if ((hasLatitude && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (hasLongitude && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) { setError("Latitude ឬ Longitude មិនត្រឹមត្រូវ"); return; }
    if (!Number.isFinite(gpsRadiusMeters) || gpsRadiusMeters < 20 || gpsRadiusMeters > 5000) { setError("កាំ GPS ត្រូវនៅចន្លោះ 20 ដល់ 5,000 ម៉ែត្រ"); return; }
    setSaving(true); setError("");
    try {
      await saveBranch(editingId, { ...form, name: form.name.trim(), address: form.address.trim(), manager: form.manager.trim(), phone: form.phone.trim(), latitude, longitude, gpsRadiusMeters });
      setForm(emptyBranchForm); setEditingId(null); setShowNew(false);
    } catch (saveError) { setError(saveError.message || "មិនអាចរក្សាទុកសាខាបានទេ"); }
    finally { setSaving(false); }
  };

  const openAdd = () => { setEditingId(null); setForm(emptyBranchForm); setError(""); setShowNew(true); };
  const editBranch = (branch) => { setEditingId(branch.id); setForm(branchForm(branch)); setError(""); setShowNew(true); };

  const toggleStatus = async (id) => { setError(""); try { await toggleBranchStatus(id); } catch (toggleError) { setError(toggleError.message || "មិនអាចប្ដូរស្ថានភាពសាខាបានទេ"); } };

  return (
    <>
      <OrgHeader title="សាខា" sub={`សង្ខេបវត្តមានតាមសាខា ${latestDates.length || 0} ថ្ងៃចុងក្រោយ`} onAdd={openAdd} addLabel="បន្ថែមសាខា" />

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
        <div className="hidden overflow-x-auto md:block">
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
        <div className="divide-y divide-[#EBEDF3] md:hidden">
          {branchSummaries.map(({ branch, staff, records, counts, rate }) => (
            <article key={branch.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[#1E2333]">{branch.name}</div>
                  <div className="mt-0.5 text-xs text-[#8A8FA3]">{branch.type} · {staff} បុគ្គលិក</div>
                </div>
                <span className="shrink-0 rounded-full bg-[#EEF1FB] px-2.5 py-1 text-xs font-semibold text-[#2A3F8F]">{records ? `${rate}%` : "—"}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {["មានវត្តមាន", "យឺត", "អវត្តមាន", "ច្បាប់"].map((status) => (
                  <div key={status} className="rounded-xl bg-[#F7F8FB] px-1.5 py-2.5">
                    <div className="text-base font-bold" style={{ color: statusConfig[status].color }}>{counts[status]}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-[#8A8FA3]">{status}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF1FB]">
                <div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate >= 90 ? COLORS.green : rate >= 75 ? COLORS.accent : COLORS.red }} />
              </div>
            </article>
          ))}
          {!branchSummaries.length && <div className="py-10 text-center text-sm text-[#8A8FA3]">មិនមានសាខាទេ</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branchSummaries.map(({ branch, staff, rate }) => (
          <div key={branch.id} className={`bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3 ${branch.status === "អសកម្ម" ? "opacity-65" : ""}`}>
            <div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: COLORS.primaryLight }}><Building2 size={20} color={COLORS.primary} /></div><div><div className="font-semibold text-[#1E2333] text-sm">{branch.name}</div><div className="text-xs text-[#8A8FA3]">{branch.type} · {branch.status || "សកម្ម"}</div></div></div><div className="flex gap-1"><button onClick={() => editBranch(branch)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#2A3F8F] hover:bg-[#EEF1FB]" aria-label={`កែ ${branch.name}`}><Pencil size={14} /></button><button onClick={() => toggleStatus(branch.id)} aria-label={`${branch.status === "អសកម្ម" ? "បើក" : "បិទ"} ${branch.name}`} className={`w-8 h-8 rounded-lg flex items-center justify-center ${branch.status === "អសកម្ម" ? "bg-[#E9F7EF] text-[#3FA66B]" : "text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F]"}`}><Power size={15} /></button></div></div>
            {branch.address && <div className="flex items-start gap-2 text-xs text-[#5B5F73]"><MapPin size={13} className="text-[#B4B7C6] mt-0.5 shrink-0" /><span>{branch.address}</span></div>}
            <div className="flex items-start gap-2 text-xs">
              <MapPin size={13} className={`mt-0.5 shrink-0 ${branch.latitude && branch.longitude ? "text-[#3FA66B]" : "text-[#E8A33D]"}`} />
              {branch.latitude && branch.longitude ? (
                <a
                  href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2A3F8F] hover:underline"
                >
                  GPS {branch.latitude}, {branch.longitude} · កាំ {branch.gpsRadiusMeters || 100}m
                </a>
              ) : <span className="text-[#B97913]">មិនទាន់កំណត់ GPS</span>}
            </div>
            <div className="flex items-center justify-between border-t border-[#EBEDF3] pt-3 mt-1"><div className="text-xs text-[#8A8FA3]">អ្នកគ្រប់គ្រង៖ <span className="text-[#1E2333] font-medium">{branch.manager}</span></div><span className="text-[11px] font-medium rounded-full px-2.5 py-1" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>{staff} បុគ្គលិក</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#8A8FA3]">អត្រាវត្តមាន ៥ថ្ងៃ</span><span className="font-semibold" style={{ color: rate >= 90 ? COLORS.green : COLORS.accent }}>{rate}%</span></div>
          </div>
        ))}
      </div>

      {showNew && <OrgModal title={editingId ? "កែព័ត៌មានសាខា" : "បន្ថែមសាខាថ្មី"} onClose={() => { setShowNew(false); setEditingId(null); }} onSubmit={handleSubmit} submitLabel="រក្សាទុកសាខា" error={error} saving={saving}>
        <div><FieldLabel required>ឈ្មោះសាខា</FieldLabel><TextField value={form.name} onChange={update("name")} placeholder="ឧ. សាខាចំការមន" /></div>
        <div><FieldLabel>ប្រភេទ</FieldLabel><SelectField options={["ការិយាល័យកណ្តាល", "សាខា"]} value={form.type} onChange={update("type")} /></div>
        <div><FieldLabel>អាសយដ្ឋាន</FieldLabel><TextField icon={MapPin} value={form.address} onChange={update("address")} placeholder="ផ្លូវ, សង្កាត់, ខណ្ឌ, ក្រុង" /></div>
        <div><FieldLabel required>អ្នកគ្រប់គ្រងសាខា</FieldLabel><TextField value={form.manager} onChange={update("manager")} placeholder="ឈ្មោះអ្នកគ្រប់គ្រង" /></div>
        <div><FieldLabel>លេខទូរស័ព្ទ</FieldLabel><TextField icon={Phone} dir="ltr" value={form.phone} onChange={update("phone")} placeholder="0XX XXX XXX" /></div>
        <div className="rounded-xl border border-[#EBEDF3] bg-[#F7F8FB] p-3 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1E2333]"><MapPin size={15} className="text-[#2A3F8F]" /> តំបន់ GPS សាខា</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><FieldLabel>Latitude</FieldLabel><TextField dir="ltr" type="number" step="any" value={form.latitude} onChange={update("latitude")} placeholder="11.519935" /></div>
            <div><FieldLabel>Longitude</FieldLabel><TextField dir="ltr" type="number" step="any" value={form.longitude} onChange={update("longitude")} placeholder="104.9092321" /></div>
            <div><FieldLabel>កាំ GPS (ម៉ែត្រ)</FieldLabel><TextField dir="ltr" type="number" min="20" max="5000" value={form.gpsRadiusMeters} onChange={update("gpsRadiusMeters")} placeholder="100" /></div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8A8FA3]">អាចកំណត់ទីតាំងនៅទីនេះ ឬក្នុងម៉ឺនុយ GPS និង QR។ បុគ្គលិកត្រូវ Check-in/out នៅក្នុងកាំរបស់សាខាខ្លួន។</p>
        </div>
      </OrgModal>}
    </>
  );
}
