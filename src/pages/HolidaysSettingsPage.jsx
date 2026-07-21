import React, { useState } from "react";
import { X, Pencil } from "lucide-react";
import { FieldLabel, TextField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

export default function HolidaysSettingsPage({ holidays, setHolidays }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ date: "", name: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.date.trim() || !form.name.trim()) {
      setError("សូមបំពេញកាលបរិច្ឆេទ និងឈ្មោះថ្ងៃឈប់សម្រាក");
      return;
    }
    setHolidays((list) => {
      const next = editingId
        ? list.map((holiday) => holiday.id === editingId ? { ...holiday, dateISO: form.date, name: form.name } : holiday)
        : [...list, { id: `HOL-${String(list.length + 1).padStart(3, "0")}`, dateISO: form.date, name: form.name }];
      return next.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    });
    setError("");
    setForm({ date: "", name: "" });
    setEditingId(null);
    setShowNew(false);
  };

  const remove = (id) => setHolidays((list) => list.filter((h) => h.id !== id));
  const edit = (holiday) => { setEditingId(holiday.id); setForm({ date: holiday.dateISO, name: holiday.name }); setError(""); setShowNew(true); };
  const years = [...new Set(holidays.map((holiday) => holiday.dateISO?.slice(0, 4)).filter(Boolean))].join(" / ");

  return (
    <>
      <OrgHeader title="ថ្ងៃឈប់សម្រាក" sub={`សរុប ${holidays.length} ថ្ងៃឈប់សម្រាកសាធារណៈ${years ? ` · ឆ្នាំ ${years}` : ""}`} onAdd={() => { setEditingId(null); setForm({ date: "", name: "" }); setShowNew(true); }} addLabel="បន្ថែមថ្ងៃឈប់សម្រាក" />

      <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
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
      </div>

      {showNew && (
        <OrgModal title={editingId ? "កែថ្ងៃឈប់សម្រាក" : "បន្ថែមថ្ងៃឈប់សម្រាកថ្មី"} onClose={() => { setShowNew(false); setEditingId(null); }} onSubmit={handleSubmit} submitLabel="រក្សាទុក" error={error}>
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
