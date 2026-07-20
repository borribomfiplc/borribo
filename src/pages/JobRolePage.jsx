import React, { useState } from "react";
import {
  User, X
} from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

export default function JobRolePage({ employees, jobRoles: roles, setJobRoles: setRoles, departments }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", dept: departments[0]?.name ?? "", level: "បុគ្គលិក" });
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("សូមបំពេញឈ្មោះតួនាទីការងារ");
      return;
    }
    setRoles((list) => [
      { id: `ROLE-${String(list.length + 1).padStart(3, "0")}`, ...form },
      ...list,
    ]);
    setError("");
    setForm({ name: "", dept: departments[0]?.name ?? "", level: "បុគ្គលិក" });
    setShowNew(false);
  };

  const remove = (id) => setRoles((list) => list.filter((r) => r.id !== id));

  return (
    <>
      <OrgHeader
        title="តួនាទីការងារ"
        sub={`សរុប ${roles.length} តួនាទី`}
        onAdd={() => setShowNew(true)}
        addLabel="បន្ថែមតួនាទី"
      />
      <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
              <th className="text-right font-medium px-5 py-3">តួនាទី</th>
              <th className="text-right font-medium px-5 py-3">នាយកដ្ឋាន</th>
              <th className="text-right font-medium px-5 py-3">កម្រិត</th>
              <th className="text-right font-medium px-5 py-3">ចំនួនបុគ្គលិក</th>
              <th className="text-right font-medium px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const count = employees.filter((e) => e.role === r.name).length;
              return (
                <tr key={r.id} className="border-t border-[#EBEDF3] hover:bg-[#F7F8FB]/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                      <span className="font-medium text-[#1E2333]">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{r.dept}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1"
                      style={{
                        background: r.level === "គ្រប់គ្រង" ? COLORS.amberLight : COLORS.greenLight,
                        color: r.level === "គ្រប់គ្រង" ? COLORS.accent : COLORS.green,
                      }}
                    >
                      {r.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{count}</td>
                  <td className="px-5 py-3.5 text-left">
                    <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] ml-auto">
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {roles.map((r) => {
          const count = employees.filter((e) => e.role === r.name).length;
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div className="font-medium text-[#1E2333] text-sm">{r.name}</div>
                </div>
                <button onClick={() => remove(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA]">
                  <X size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-2.5">
                <span>{r.dept} · {r.level}</span>
                <span>{count} បុគ្គលិក</span>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <OrgModal title="បន្ថែមតួនាទីថ្មី" onClose={() => setShowNew(false)} onSubmit={handleSubmit} submitLabel="រក្សាទុកតួនាទី" error={error}>
          <div>
            <FieldLabel required>ឈ្មោះតួនាទី</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឧ. មន្ត្រីសវនកម្ម" />
          </div>
          <div>
            <FieldLabel>នាយកដ្ឋាន</FieldLabel>
            <SelectField options={departments.map((d) => d.name)} value={form.dept} onChange={update("dept")} />
          </div>
          <div>
            <FieldLabel>កម្រិត</FieldLabel>
            <SelectField options={["បុគ្គលិក", "គ្រប់គ្រង"]} value={form.level} onChange={update("level")} />
          </div>
        </OrgModal>
      )}
    </>
  );
}
