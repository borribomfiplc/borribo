import React, { useState } from "react";
import {
  X, Mail, Shield
} from "lucide-react";
import { COLORS } from "../data/theme";
import { statusStyle } from "../data/mockData";
import { FieldLabel, TextField, SelectField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

export default function UserRolesPage({ users, setUsers, roles, branches }) {
  const [tab, setTab] = useState("users");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: roles[0]?.name ?? "", branch: branches[0]?.name ?? "" });
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("សូមបំពេញឈ្មោះ និងអ៊ីមែល");
      return;
    }
    setUsers((list) => [{ id: `USR-${String(list.length + 1).padStart(3, "0")}`, status: "សកម្ម", ...form }, ...list]);
    setError("");
    setForm({ name: "", email: "", role: roles[0]?.name ?? "", branch: branches[0]?.name ?? "" });
    setShowNew(false);
  };

  const remove = (id) => setUsers((list) => list.filter((u) => u.id !== id));

  return (
    <>
      <OrgHeader title="អ្នកប្រើប្រាស់ និងតួនាទី" sub="គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់ប្រព័ន្ធ និងសិទ្ធិចូលប្រើ" onAdd={() => setShowNew(true)} addLabel="បន្ថែមអ្នកប្រើប្រាស់" />

      <div className="flex items-center gap-2 mb-5 bg-white rounded-xl border border-[#EBEDF3] p-1 w-fit">
        {[
          { key: "users", label: "អ្នកប្រើប្រាស់" },
          { key: "roles", label: "តួនាទី" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "text-white" : "text-[#5B5F73] hover:bg-[#F7F8FB]"
            }`}
            style={tab === t.key ? { background: COLORS.primary } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <div className="hidden md:block bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F8FB] text-[#8A8FA3] text-xs">
                <th className="text-right font-medium px-5 py-3">អ្នកប្រើប្រាស់</th>
                <th className="text-right font-medium px-5 py-3">តួនាទី</th>
                <th className="text-right font-medium px-5 py-3">សាខា</th>
                <th className="text-right font-medium px-5 py-3">ស្ថានភាព</th>
                <th className="text-right font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#EBEDF3]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xs font-bold flex items-center justify-center shrink-0">
                        {u.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-[#1E2333]">{u.name}</div>
                        <div className="text-xs text-[#B4B7C6]" dir="ltr">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{u.role}</td>
                  <td className="px-5 py-3.5 text-[#5B5F73]">{u.branch}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium rounded-full px-2.5 py-1"
                      style={{ background: statusStyle[u.status]?.bg, color: statusStyle[u.status]?.fg }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-left">
                    <button onClick={() => remove(u.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8A8FA3] hover:bg-[#F5F6FA] ml-auto">
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${r.color}1A` }}>
                  <Shield size={20} color={r.color} />
                </div>
                <div className="font-semibold text-[#1E2333] text-sm">{r.name}</div>
              </div>
              <p className="text-xs text-[#5B5F73] leading-relaxed">{r.description}</p>
              <div className="text-xs text-[#8A8FA3] border-t border-[#EBEDF3] pt-3">
                {users.filter((u) => u.role === r.name).length} អ្នកប្រើប្រាស់
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <OrgModal title="បន្ថែមអ្នកប្រើប្រាស់ថ្មី" onClose={() => setShowNew(false)} onSubmit={handleSubmit} submitLabel="រក្សាទុកអ្នកប្រើប្រាស់" error={error}>
          <div>
            <FieldLabel required>ឈ្មោះ</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឈ្មោះពេញ" />
          </div>
          <div>
            <FieldLabel required>អ៊ីមែល</FieldLabel>
            <TextField icon={Mail} dir="ltr" value={form.email} onChange={update("email")} placeholder="name@mfi.com.kh" />
          </div>
          <div>
            <FieldLabel>តួនាទី</FieldLabel>
            <SelectField options={roles.map((r) => r.name)} value={form.role} onChange={update("role")} />
          </div>
          <div>
            <FieldLabel>សាខា</FieldLabel>
            <SelectField options={branches.map((b) => b.name)} value={form.branch} onChange={update("branch")} />
          </div>
        </OrgModal>
      )}
    </>
  );
}
