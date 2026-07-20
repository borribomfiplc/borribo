import React, { useState } from "react";
import {
  Building2, X, MapPin, Phone
} from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

export default function BranchPage({ employees, branches, setBranches }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", type: "សាខា", address: "", manager: "", phone: "" });
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.manager.trim()) {
      setError("សូមបំពេញឈ្មោះសាខា និងអ្នកគ្រប់គ្រង");
      return;
    }
    setBranches((list) => [
      { id: `BR-${String(list.length + 1).padStart(3, "0")}`, ...form },
      ...list,
    ]);
    setError("");
    setForm({ name: "", type: "សាខា", address: "", manager: "", phone: "" });
    setShowNew(false);
  };

  const remove = (id) => setBranches((list) => list.filter((b) => b.id !== id));

  return (
    <>
      <OrgHeader
        title="សាខា"
        sub={`សរុប ${branches.length} សាខា/ការិយាល័យ`}
        onAdd={() => setShowNew(true)}
        addLabel="បន្ថែមសាខា"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const count = employees.filter((e) => e.branch === b.name).length;
          return (
            <div key={b.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: COLORS.primaryLight }}>
                    <Building2 size={20} color={COLORS.primary} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1E2333] text-sm">{b.name}</div>
                    <div className="text-xs text-[#8A8FA3]">{b.type}</div>
                  </div>
                </div>
                <button onClick={() => remove(b.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
                  <X size={15} />
                </button>
              </div>
              {b.address && (
                <div className="flex items-start gap-2 text-xs text-[#5B5F73]">
                  <MapPin size={13} className="text-[#B4B7C6] mt-0.5 shrink-0" />
                  <span>{b.address}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#EBEDF3] pt-3 mt-1">
                <div className="text-xs text-[#8A8FA3]">
                  អ្នកគ្រប់គ្រង៖ <span className="text-[#1E2333] font-medium">{b.manager}</span>
                </div>
                <span className="text-[11px] font-medium rounded-full px-2.5 py-1" style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                  {count} បុគ្គលិក
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <OrgModal title="បន្ថែមសាខាថ្មី" onClose={() => setShowNew(false)} onSubmit={handleSubmit} submitLabel="រក្សាទុកសាខា" error={error}>
          <div>
            <FieldLabel required>ឈ្មោះសាខា</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឧ. សាខាចំការមន" />
          </div>
          <div>
            <FieldLabel>ប្រភេទ</FieldLabel>
            <SelectField options={["ការិយាល័យកណ្តាល", "សាខា"]} value={form.type} onChange={update("type")} />
          </div>
          <div>
            <FieldLabel>អាសយដ្ឋាន</FieldLabel>
            <TextField icon={MapPin} value={form.address} onChange={update("address")} placeholder="ផ្លូវ, សង្កាត់, ខណ្ឌ, ក្រុង" />
          </div>
          <div>
            <FieldLabel required>អ្នកគ្រប់គ្រងសាខា</FieldLabel>
            <TextField value={form.manager} onChange={update("manager")} placeholder="ឈ្មោះអ្នកគ្រប់គ្រង" />
          </div>
          <div>
            <FieldLabel>លេខទូរស័ព្ទ</FieldLabel>
            <TextField icon={Phone} dir="ltr" value={form.phone} onChange={update("phone")} placeholder="0XX XXX XXX" />
          </div>
        </OrgModal>
      )}
    </>
  );
}
