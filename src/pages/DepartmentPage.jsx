import React, { useState } from "react";
import { Power, Briefcase } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField } from "../components/shared/FormFields";
import { OrgHeader, OrgModal } from "../components/shared/OrgWidgets";

export default function DepartmentPage({ employees, departments, setDepartments }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", head: "", description: "", status: "សកម្ម" });
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.name.trim() || !form.head.trim()) {
      setError("សូមបំពេញឈ្មោះនាយកដ្ឋាន និងប្រធាននាយកដ្ឋាន");
      return;
    }
    setDepartments((list) => [
      { id: `DEPT-${String(list.length + 1).padStart(3, "0")}`, ...form },
      ...list,
    ]);
    setError("");
    setForm({ name: "", head: "", description: "", status: "សកម្ម" });
    setShowNew(false);
  };

  const toggleStatus = (id) => setDepartments((list) => list.map((department) => department.id === id ? { ...department, status: department.status === "អសកម្ម" ? "សកម្ម" : "អសកម្ម" } : department));

  return (
    <>
      <OrgHeader
        title="នាយកដ្ឋាន"
        sub={`សរុប ${departments.length} នាយកដ្ឋាន`}
        onAdd={() => setShowNew(true)}
        addLabel="បន្ថែមនាយកដ្ឋាន"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => {
          const count = employees.filter((e) => e.dept === d.name).length;
          return (
            <div key={d.id} className={`bg-white rounded-2xl border border-[#EBEDF3] p-5 flex flex-col gap-3 ${d.status === "អសកម្ម" ? "opacity-65" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: COLORS.purpleLight }}>
                    <Briefcase size={20} color={COLORS.purple} />
                  </div>
                  <div><div className="font-semibold text-[#1E2333] text-sm">{d.name}</div><div className="text-[11px] text-[#8A8FA3] mt-0.5">{d.status || "សកម្ម"}</div></div>
                </div>
                <button onClick={() => toggleStatus(d.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${d.status === "អសកម្ម" ? "bg-[#E9F7EF] text-[#3FA66B]" : "text-[#8A8FA3] hover:bg-[#FBEBE8] hover:text-[#D9614F]"}`}>
                  <Power size={15} />
                </button>
              </div>
              {d.description && <p className="text-xs text-[#5B5F73] leading-relaxed">{d.description}</p>}
              <div className="flex items-center justify-between border-t border-[#EBEDF3] pt-3 mt-1">
                <div className="text-xs text-[#8A8FA3]">
                  ប្រធាន៖ <span className="text-[#1E2333] font-medium">{d.head}</span>
                </div>
                <span className="text-[11px] font-medium rounded-full px-2.5 py-1" style={{ background: COLORS.purpleLight, color: COLORS.purple }}>
                  {count} បុគ្គលិក
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <OrgModal title="បន្ថែមនាយកដ្ឋានថ្មី" onClose={() => setShowNew(false)} onSubmit={handleSubmit} submitLabel="រក្សាទុកនាយកដ្ឋាន" error={error}>
          <div>
            <FieldLabel required>ឈ្មោះនាយកដ្ឋាន</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឧ. ទីផ្សារឌីជីថល" />
          </div>
          <div>
            <FieldLabel required>ប្រធាននាយកដ្ឋាន</FieldLabel>
            <TextField value={form.head} onChange={update("head")} placeholder="ឈ្មោះប្រធាននាយកដ្ឋាន" />
          </div>
          <div>
            <FieldLabel>ការពិពណ៌នា</FieldLabel>
            <textarea
              value={form.description}
              onChange={update("description")}
              rows={3}
              placeholder="ការទទួលខុសត្រូវរបស់នាយកដ្ឋាននេះ..."
              className="w-full bg-[#F5F6FA] rounded-xl px-4 py-2.5 text-sm text-[#1E2333] placeholder:text-[#B4B7C6] outline-none focus:ring-2 focus:ring-[#2A3F8F]/20 resize-none"
            />
          </div>
        </OrgModal>
      )}
    </>
  );
}
