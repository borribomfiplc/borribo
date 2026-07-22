import React, { useMemo, useRef, useState } from "react";
import { Briefcase, Camera, ChevronRight, Eye, EyeOff, Mail, MapPin, Phone, Save, Shield, User } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, SectionCard, SelectField, TextField } from "../components/shared/FormFields";
import { createEmployee, updateEmployee } from "../services/employees";
import { imageFileToDataUrl } from "../utils/employeePhoto";

const emptyForm = (branches, departments, jobRoles) => ({
  name: "", gender: "ប្រុស", dob: "", phone: "", email: "", address: "",
  department: departments[0]?.name || "", position: jobRoles[0]?.name || "",
  branch: branches[0]?.name || "", employmentType: "ពេញម៉ោង", startDate: "",
  shift: "ព្រឹក", status: "សកម្ម", photo: "",
});

export default function AddEmployeePage({ onCancel, onSave, editingEmployee, employees = [], branches = [], departments = [], jobRoles = [], actorRole = "hr" }) {
  const isEditing = Boolean(editingEmployee);
  const fileRef = useRef(null);
  const [form, setForm] = useState(() => isEditing ? {
    ...emptyForm(branches, departments, jobRoles), ...editingEmployee,
    department: editingEmployee.dept || "", position: editingEmployee.role || "",
  } : emptyForm(branches, departments, jobRoles));
  const [createLogin, setCreateLogin] = useState(false);
  const [account, setAccount] = useState({ username: "", password: "", role: "employee" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const availableRoles = useMemo(() => {
    const matching = jobRoles.filter((role) => !form.department || role.dept === form.department);
    return matching.length ? matching : jobRoles;
  }, [jobRoles, form.department]);

  const handleDepartment = (event) => {
    const department = event.target.value;
    const roles = jobRoles.filter((role) => role.dept === department);
    setForm((current) => ({ ...current, department, position: roles.some((role) => role.name === current.position) ? current.position : (roles[0]?.name || "") }));
  };

  const handleUsername = (event) => {
    const username = event.target.value.trim().toLowerCase();
    setAccount((current) => ({ ...current, username }));
    setForm((current) => ({ ...current, email: username ? `${username}@borribo.com.kh` : "" }));
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photo = await imageFileToDataUrl(file);
      setForm((current) => ({ ...current, photo }));
      setError("");
    } catch (photoError) { setError(photoError.message); }
    event.target.value = "";
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.phone.trim() || !form.position || !form.department || !form.branch) {
      setError("សូមបំពេញឈ្មោះ លេខទូរស័ព្ទ សាខា នាយកដ្ឋាន និងតួនាទីឲ្យបានគ្រប់");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("អ៊ីមែលមិនត្រឹមត្រូវ"); return;
    }
    if (createLogin) {
      if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(account.username)) {
        setError("Username ត្រូវមានអក្សរអង់គ្លេស លេខ ឬ . _ - និងយ៉ាងតិច 2 តួអក្សរ"); return;
      }
      if (account.password.length < 8) { setError("Password បណ្ដោះអាសន្នត្រូវមានយ៉ាងតិច 8 តួអក្សរ"); return; }
      if (actorRole !== "admin" && account.role !== "employee") { setError("មានតែ Admin ប៉ុណ្ណោះដែលអាចបង្កើត HR ឬ Admin Account"); return; }
    }

    const employeeData = {
      ...(editingEmployee || {}), name: form.name.trim(), role: form.position, dept: form.department,
      branch: form.branch, phone: form.phone.trim(), status: form.status, gender: form.gender,
      dob: form.dob, email: form.email.trim().toLowerCase(), address: form.address.trim(), photo: form.photo || "",
      employmentType: form.employmentType, startDate: form.startDate, shift: form.shift,
    };
    setSaving(true); setError("");
    try {
      const result = isEditing
        ? { employee: await updateEmployee(employeeData) }
        : await createEmployee(
            employeeData,
            createLogin ? { enabled: true, ...account, email: employeeData.email } : { enabled: false },
            employees.reduce((highest, item) => Math.max(highest, Number(String(item.id || "").match(/^EMP-(\d+)$/)?.[1] || 0)), 0) + 1,
          );
      setSaved(true);
      window.setTimeout(() => onSave?.(result.employee || employeeData), 650);
    } catch (saveError) {
      const message = String(saveError?.message || "");
      if (/EMAIL_EXISTS/i.test(message)) setError("អ៊ីមែលនេះមាន Account រួចហើយ");
      else if (/USERNAME_EXISTS/i.test(message)) setError("Username នេះមានអ្នកប្រើរួចហើយ");
      else if (/permission|សិទ្ធិ/i.test(message)) setError("គណនីនេះមិនមានសិទ្ធិរក្សាទុក ឬគ្រប់គ្រង Account ទេ");
      else setError(message || "មិនអាចរក្សាទុកព័ត៌មានបុគ្គលិកបានទេ");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex items-start justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <button onClick={onCancel} className="text-xs text-[#8A8FA3] hover:text-[#2A3F8F] flex items-center gap-1 mb-1.5">
            បញ្ជីបុគ្គលិក <ChevronRight size={12} className="rotate-180" /> {isEditing ? "កែសម្រួល" : "បន្ថែមថ្មី"}
          </button>
          <h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">{isEditing ? "កែសម្រួលព័ត៌មានបុគ្គលិក" : "បន្ថែមបុគ្គលិកថ្មី"}</h1>
          {isEditing && <p className="text-xs text-[#8A8FA3] mt-1">លេខសម្គាល់៖ {editingEmployee.id}</p>}
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="border border-[#EBEDF3] rounded-xl px-4 py-2.5 text-sm text-[#5B5F73]">បោះបង់</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-white text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-60" style={{ background: COLORS.primary }}>
            <Save size={16} /> {saving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3 mb-5">{error}</div>}
      {saved && <div className="text-sm text-[#3FA66B] bg-[#E9F7EF] rounded-xl px-4 py-3 mb-5">រក្សាទុកបានជោគជ័យ! កំពុងត្រឡប់ទៅបញ្ជី...</div>}

      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            {form.photo ? <img src={form.photo} alt="រូបបុគ្គលិក" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-xl font-bold flex items-center justify-center">{form.name.trim()?.slice(0, 1) || <User size={26} />}</div>}
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-[#EBEDF3] shadow flex items-center justify-center text-[#2A3F8F]" title="ជ្រើសរើសរូបភាព"><Camera size={15} /></button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handlePhoto} className="hidden" />
          </div>
          <div><div className="text-sm font-medium text-[#1E2333]">រូបភាពប្រូហ្វាល់</div><div className="text-xs text-[#8A8FA3] mt-1">ចុចរូបកាមេរ៉ា · JPG/PNG មិនលើស 2MB</div>{form.photo && <button type="button" onClick={() => setForm((current) => ({ ...current, photo: "" }))} className="text-xs text-[#D9614F] mt-2">លុបរូបភាព</button>}</div>
        </div>

        <SectionCard title="ព័ត៌មានផ្ទាល់ខ្លួន" icon={User}>
          <div><FieldLabel required>ឈ្មោះពេញ</FieldLabel><TextField value={form.name} onChange={update("name")} placeholder="ឧ. សុខ ស្រីលក្ខណ៍" /></div>
          <div><FieldLabel>ភេទ</FieldLabel><SelectField options={["ប្រុស", "ស្រី"]} value={form.gender} onChange={update("gender")} /></div>
          <div><FieldLabel>ថ្ងៃខែឆ្នាំកំណើត</FieldLabel><TextField type="date" value={form.dob} onChange={update("dob")} /></div>
          <div><FieldLabel required>លេខទូរស័ព្ទ</FieldLabel><TextField dir="ltr" icon={Phone} value={form.phone} onChange={update("phone")} placeholder="012 345 678" /></div>
          <div><FieldLabel>អ៊ីមែល</FieldLabel><TextField dir="ltr" icon={Mail} type="email" value={form.email} onChange={update("email")} placeholder="name@borribo.com.kh" /></div>
          <div><FieldLabel>អាសយដ្ឋាន</FieldLabel><TextField icon={MapPin} value={form.address} onChange={update("address")} /></div>
        </SectionCard>

        <SectionCard title="ព័ត៌មានការងារ" icon={Briefcase}>
          {isEditing && <div className="md:col-span-2 rounded-xl bg-[#EEF1FB] px-4 py-3 text-xs text-[#2A3F8F]">ការប្តូរសាខា នាយកដ្ឋាន តួនាទី ឬស្ថានភាព ត្រូវធ្វើតាមប៊ូតុង <b>ប្រតិបត្តិការបុគ្គលិក</b> ក្នុងទំព័រព័ត៌មានលម្អិត ដើម្បីរក្សាប្រវត្តិ និងលិខិតសម្រេច។</div>}
          <div><FieldLabel required>នាយកដ្ឋាន</FieldLabel><SelectField options={departments.map((item) => item.name)} value={form.department} onChange={handleDepartment} disabled={isEditing} /></div>
          <div><FieldLabel required>តួនាទី</FieldLabel><SelectField options={availableRoles.map((item) => item.name)} value={form.position} onChange={update("position")} disabled={isEditing} /></div>
          <div><FieldLabel required>សាខា</FieldLabel><SelectField options={branches.map((item) => item.name)} value={form.branch} onChange={update("branch")} disabled={isEditing} /></div>
          <div><FieldLabel>ប្រភេទការងារ</FieldLabel><SelectField options={["ពេញម៉ោង", "ក្រៅម៉ោង", "កិច្ចសន្យា"]} value={form.employmentType} onChange={update("employmentType")} /></div>
          <div><FieldLabel>ថ្ងៃចូលបម្រើការងារ</FieldLabel><TextField type="date" value={form.startDate} onChange={update("startDate")} /></div>
          <div><FieldLabel>វេន</FieldLabel><SelectField options={["ព្រឹក", "ល្ងាច", "ប្តូរវេន"]} value={form.shift} onChange={update("shift")} /></div>
          <div><FieldLabel>ស្ថានភាព</FieldLabel><SelectField options={["សកម្ម", "ឈប់សម្រាក", "អសកម្ម"]} value={form.status} onChange={update("status")} disabled={isEditing} /></div>
        </SectionCard>

        {!isEditing && <SectionCard title="គណនី និងសិទ្ធិចូលប្រើ" icon={Shield}>
          <label className="md:col-span-2 flex items-start gap-3 rounded-xl bg-[#F7F8FB] p-4 cursor-pointer"><input type="checkbox" checked={createLogin} onChange={(event) => setCreateLogin(event.target.checked)} className="mt-1" /><span><span className="block text-sm font-semibold text-[#1E2333]">បង្កើត Login Account ផង</span><span className="block text-xs text-[#8A8FA3] mt-1">បង្កើត Firebase Account, Username និង Profile ដោយស្វ័យប្រវត្តិ</span></span></label>
          {createLogin && <>
            <div><FieldLabel required>Username</FieldLabel><TextField dir="ltr" value={account.username} onChange={handleUsername} placeholder="bora.chhun" /></div>
            <div><FieldLabel required>Password បណ្ដោះអាសន្ន</FieldLabel><div className="relative"><TextField dir="ltr" type={showPassword ? "text" : "password"} value={account.password} onChange={(event) => setAccount((current) => ({ ...current, password: event.target.value }))} placeholder="យ៉ាងតិច 8 តួអក្សរ" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8FA3]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><FieldLabel>Role</FieldLabel><SelectField options={actorRole === "admin" ? ["employee", "hr", "admin"] : ["employee"]} value={account.role} onChange={(event) => setAccount((current) => ({ ...current, role: event.target.value }))} /></div>
            <div className="text-xs text-[#8A8FA3] self-end pb-3">Email Login: <span dir="ltr" className="font-medium text-[#2A3F8F]">{form.email || "username@borribo.com.kh"}</span></div>
          </>}
        </SectionCard>}
      </div>
    </>
  );
}
