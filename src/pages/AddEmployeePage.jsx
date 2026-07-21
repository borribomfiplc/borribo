import React, { useState } from "react";
import {
  ChevronRight, User, Camera, Mail, MapPin, Phone, Briefcase, Shield, Save
} from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, TextField, SelectField, SectionCard } from "../components/shared/FormFields";

export default function AddEmployeePage({ onCancel, onSave, employees, setEmployees, editingEmployee }) {
  const isEditing = Boolean(editingEmployee);

  const [form, setForm] = useState(() =>
    isEditing
      ? {
          name: editingEmployee.name || "",
          gender: editingEmployee.gender || "ប្រុស",
          dob: editingEmployee.dob || "",
          phone: editingEmployee.phone || "",
          email: editingEmployee.email || "",
          address: editingEmployee.address || "",
          department: editingEmployee.dept || "ទីផ្សារ",
          position: editingEmployee.role || "",
          branch: editingEmployee.branch || "ការិយាល័យកណ្តាល",
          employmentType: editingEmployee.employmentType || "ពេញម៉ោង",
          startDate: editingEmployee.startDate || "",
          shift: editingEmployee.shift || "ព្រឹក",
          status: editingEmployee.status || "សកម្ម",
        }
      : {
          name: "",
          gender: "ប្រុស",
          dob: "",
          phone: "",
          email: "",
          address: "",
          department: "ទីផ្សារ",
          position: "",
          branch: "ការិយាល័យកណ្តាល",
          employmentType: "ពេញម៉ោង",
          startDate: "",
          shift: "ព្រឹក",
          status: "សកម្ម",
        }
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const nextId = `EMP-${String(employees.length + 1).padStart(3, "0")}`;

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.position.trim()) {
      setError("សូមបំពេញឈ្មោះ តួនាទី និងលេខទូរស័ព្ទឲ្យបានគ្រប់ជាមុនសិន");
      return;
    }
    setError("");
    const employeeData = {
      id: isEditing ? editingEmployee.id : nextId,
      name: form.name.trim(),
      role: form.position.trim(),
      dept: form.department,
      branch: form.branch,
      phone: form.phone.trim(),
      status: form.status,
    };
    if (isEditing) {
      setEmployees((list) => list.map((emp) => (emp.id === editingEmployee.id ? { ...emp, ...employeeData } : emp)));
    } else {
      setEmployees((list) => [employeeData, ...list]);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSave && onSave(employeeData);
    }, 900);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <button
            onClick={onCancel}
            className="text-xs text-[#8A8FA3] hover:text-[#2A3F8F] flex items-center gap-1 mb-1.5"
          >
            បញ្ជីបុគ្គលិក <ChevronRight size={12} className="rotate-180" /> {isEditing ? "កែសម្រួលបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}
          </button>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">
            {isEditing ? "កែសម្រួលព័ត៌មានបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1">
            {isEditing ? `លេខសម្គាល់៖ ${editingEmployee.id}` : `លេខសម្គាល់ថ្មី៖ ${nextId}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancel}
            className="border border-[#EBEDF3] rounded-xl px-4 py-2.5 text-sm font-medium text-[#5B5F73]"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 text-white text-sm font-semibold rounded-xl px-4 sm:px-5 py-2.5 whitespace-nowrap"
            style={{ background: COLORS.primary }}
          >
            <Save size={16} />
            {isEditing ? "រក្សាទុកការកែប្រែ" : "រក្សាទុកបុគ្គលិក"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3 mb-5">{error}</div>
      )}
      {saved && (
        <div className="text-sm text-[#3FA66B] bg-[#E9F7EF] rounded-xl px-4 py-3 mb-5">
          {isEditing ? "បានកែប្រែព័ត៌មានបុគ្គលិកដោយជោគជ័យ! កំពុងត្រឡប់ទៅបញ្ជីវិញ..." : "បានរក្សាទុកបុគ្គលិកដោយជោគជ័យ! កំពុងត្រឡប់ទៅបញ្ជីវិញ..."}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Photo */}
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xl font-bold flex items-center justify-center">
              {form.name.trim() ? form.name.trim().slice(0, 1) : <User size={24} />}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#EBEDF3] flex items-center justify-center text-[#5B5F73]"
              title="ផ្ទុករូបភាព"
            >
              <Camera size={12} />
            </button>
          </div>
          <div>
            <div className="text-sm font-medium text-[#1E2333]">រូបភាពប្រូហ្វាល់</div>
            <div className="text-xs text-[#8A8FA3] mt-0.5">JPG, PNG (មិនលើសពី 2MB)</div>
          </div>
        </div>

        {/* Personal info */}
        <SectionCard title="ព័ត៌មានផ្ទាល់ខ្លួន" icon={User}>
          <div>
            <FieldLabel required>ឈ្មោះពេញ</FieldLabel>
            <TextField value={form.name} onChange={update("name")} placeholder="ឧ. សុខ ស្រីលក្ខណ៍" />
          </div>
          <div>
            <FieldLabel>ភេទ</FieldLabel>
            <SelectField options={["ប្រុស", "ស្រី"]} value={form.gender} onChange={update("gender")} />
          </div>
          <div>
            <FieldLabel>ថ្ងៃខែឆ្នាំកំណើត</FieldLabel>
            <TextField type="date" value={form.dob} onChange={update("dob")} />
          </div>
          <div>
            <FieldLabel required>លេខទូរស័ព្ទ</FieldLabel>
            <TextField dir="ltr" icon={Phone} value={form.phone} onChange={update("phone")} placeholder="012 345 678" />
          </div>
          <div>
            <FieldLabel>អ៊ីមែល</FieldLabel>
            <TextField dir="ltr" icon={Mail} type="email" value={form.email} onChange={update("email")} placeholder="name@mfi.com" />
          </div>
          <div>
            <FieldLabel>អាសយដ្ឋាន</FieldLabel>
            <TextField icon={MapPin} value={form.address} onChange={update("address")} placeholder="ភូមិ ឃុំ/សង្កាត់ ខេត្ត/ក្រុង" />
          </div>
        </SectionCard>

        {/* Employment info */}
        <SectionCard title="ព័ត៌មានការងារ" icon={Briefcase}>
          <div>
            <FieldLabel>នាយកដ្ឋាន</FieldLabel>
            <SelectField
              options={["ទីផ្សារ", "IT", "គណនេយ្យ", "ឥណទាន", "HR", "គិតលុយ", "សវនកម្ម"]}
              value={form.department}
              onChange={update("department")}
            />
          </div>
          <div>
            <FieldLabel required>តួនាទី</FieldLabel>
            <TextField value={form.position} onChange={update("position")} placeholder="ឧ. មន្ត្រីទីផ្សារ" />
          </div>
          <div>
            <FieldLabel>សាខា</FieldLabel>
            <SelectField
              options={["ការិយាល័យកណ្តាល", "សាខាទួលគោក", "សាខាសែនសុខ", "សាខាព្រែកលៀប"]}
              value={form.branch}
              onChange={update("branch")}
            />
          </div>
          <div>
            <FieldLabel>ប្រភេទការងារ</FieldLabel>
            <SelectField options={["ពេញម៉ោង", "ក្រៅម៉ោង", "កិច្ចសន្យា"]} value={form.employmentType} onChange={update("employmentType")} />
          </div>
          <div>
            <FieldLabel>ថ្ងៃចូលបម្រើការងារ</FieldLabel>
            <TextField type="date" value={form.startDate} onChange={update("startDate")} />
          </div>
          <div>
            <FieldLabel>វេន</FieldLabel>
            <SelectField options={["ព្រឹក", "ល្ងាច", "ប្តូរវេន"]} value={form.shift} onChange={update("shift")} />
          </div>
          <div>
            <FieldLabel>ស្ថានភាព</FieldLabel>
            <SelectField options={["សកម្ម", "ឈប់សម្រាក", "អសកម្ម"]} value={form.status} onChange={update("status")} />
          </div>
        </SectionCard>

        <SectionCard title="គណនី និងសិទ្ធិចូលប្រើ" icon={Shield}>
          <p className="md:col-span-2 text-sm text-[#5B5F73] leading-relaxed">
            ការរក្សាទុកនៅទីនេះបង្កើតតែព័ត៌មានបុគ្គលិក។ ដើម្បីបង្កើតគណនីចូលប្រើ និងកំណត់ Role ពិតប្រាកដ សូមប្រើ <span className="font-semibold">npm run provision-users</span> ដោយ Admin។
          </p>
        </SectionCard>
      </div>

      {/* Bottom actions (mobile-friendly duplicate) */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 border border-[#EBEDF3] rounded-xl py-3 text-sm font-medium text-[#5B5F73]"
        >
          បោះបង់
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-xl py-3"
          style={{ background: COLORS.primary }}
        >
          <Save size={16} />
          {isEditing ? "រក្សាទុកការកែប្រែ" : "រក្សាទុកបុគ្គលិក"}
        </button>
      </div>
    </>
  );
}
