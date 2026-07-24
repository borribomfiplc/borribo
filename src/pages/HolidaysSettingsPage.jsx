import React, { useState } from "react";
import { X, Pencil } from "lucide-react";
import { FieldLabel, TextField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";
import { deleteHoliday, saveHoliday } from "../services/organization";

export default function HolidaysSettingsPage({ holidays, setHolidays }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ date: "", name: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.date.trim() || !form.name.trim()) { setError("សូមបំពេញកាលបរិច្ឆេទ និងឈ្មោះថ្ងៃឈប់សម្រាក"); return; }
    setSaving(true); setError("");
    try {
      await saveHoliday(editingId, { dateISO: form.date, name: form.name.trim() });
      setForm({ date: "", name: "" }); setEditingId(null); setShowNew(false);
    } catch (saveError) { setError(saveError.message || "មិនអាចរក្សាទុកថ្ងៃឈប់សម្រាកបានទេ"); }
    finally { setSaving(false); }
  };

  const remove = async (id) => { if (!window.confirm("តើអ្នកចង់លុបថ្ងៃឈប់សម្រាកនេះមែនទេ?")) return; setError(""); try { await deleteHoliday(id); } catch (removeError) { setError(removeError.message || "មិនអាចលុបថ្ងៃឈប់សម្រាកបានទេ"); } };
  const edit = (holiday) => { setEditingId(holiday.id); setForm({ date: holiday.dateISO, name: holiday.name }); setError(""); setShowNew(true); };
  const years = [...new Set(holidays.map((holiday) => holiday.dateISO?.slice(0, 4)).filter(Boolean))].join(" / ");

  return (
    <>
      <OrgHeader title="ថ្ងៃឈប់សម្រាក" sub={`សរុប ${holidays.length} ថ្ងៃឈប់សម្រាកសាធារណៈ${years ? ` · ឆ្នាំ ${years}` : ""}`} onAdd={() => { setEditingId(null); setForm({ date: "", name: "" }); setShowNew(true); }} addLabel="បន្ថែមថ្ងៃឈប់សម្រាក" />

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">កាលបរិច្ឆេទ</th>
              <th className="text-right font-medium px-5 py-3">ឈ្មោះថ្ងៃឈប់សម្រាក</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id} className="border-t border-[#EBEDF3]">
                <td className="px-5 py-3.5 text-[#5B5F73]" dir="ltr">{h.dateISO}</td>
                <td className="px-5 py-3.5 font-medium text-[#1E2333]">{h.name}</td>
                <td className="px-5 py-3.5 text-left">
                  <div className="flex justify-end gap-1">
                  <button onClick={() => edit(h)} aria-label={`កែ ${h.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#EEF1FB] hover:text-[#2A3F8F]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(h.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] ml-auto">
                    <X size={15} />
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="divide-y divide-[#EBEDF3] md:hidden">
          {holidays.map((holiday) => (
            <article key={holiday.id} className="flex items-start gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#EEF1FB] text-[#2A3F8F]">
                <span className="text-sm font-bold leading-none">{holiday.dateISO?.slice(8, 10) || "—"}</span>
                <span className="mt-1 text-[9px] leading-none">{holiday.dateISO?.slice(5, 7) || ""}/{holiday.dateISO?.slice(0, 4) || ""}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[#1E2333]">{holiday.name}</div>
                <div className="mt-1 text-xs text-[#8A8FA3]" dir="ltr">{holiday.dateISO}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => edit(holiday)} aria-label={`កែ ${holiday.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#2A3F8F] hover:bg-[#EEF1FB]"><Pencil size={16} /></button>
                <button onClick={() => remove(holiday.id)} aria-label={`លុប ${holiday.name}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#D9614F] hover:bg-[#FBEBE8]"><X size={17} /></button>
              </div>
            </article>
          ))}
          {!holidays.length && <div className="py-10 text-center text-sm text-[#8A8FA3]">មិនមានថ្ងៃឈប់សម្រាកទេ</div>}
        </div>
      </div>

      {showNew && (
        <OrgModal title={editingId ? "កែថ្ងៃឈប់សម្រាក" : "បន្ថែមថ្ងៃឈប់សម្រាកថ្មី"} onClose={() => { setShowNew(false); setEditingId(null); }} onSubmit={handleSubmit} submitLabel="រក្សាទុក" error={error} saving={saving}>
          <div>
            <FieldLabel required>កាលបរិច្ឆេទ</FieldLabel>
            <TextField type="date" dir="ltr" value={form.date} onChange={update("date")} />
          </div>
          <div>
            <FieldLabel required>ឈ្មោះថ្ងៃឈប់សម្រាក</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឧ. ថ្ងៃឈប់សម្រាកពិសេស" />
          </div>
        </OrgModal>
      )}
    </>
  );
}
