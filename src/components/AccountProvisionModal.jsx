import React, { useState } from "react";
import { Eye, EyeOff, Save, Shield, X } from "lucide-react";
import { COLORS } from "../data/theme";
import { FieldLabel, SelectField, TextField } from "./shared/FormFields";
import { provisionEmployeeAccount } from "../services/employees";

export default function AccountProvisionModal({ employee, actorRole = "hr", onClose, onSaved }) {
  const [form, setForm] = useState({ username: "", password: "", role: "employee" });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async () => {
    if (actorRole !== "admin") return setError("មានតែ Admin ប៉ុណ្ណោះដែលអាចបង្កើត Login Account");
    const username = form.username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) return setError("Username ត្រូវមានអក្សរអង់គ្លេស លេខ ឬ . _ - និងយ៉ាងតិច 2 តួអក្សរ");
    if (form.password.length < 8) return setError("Password បណ្ដោះអាសន្នត្រូវមានយ៉ាងតិច 8 តួអក្សរ");
    setSaving(true); setError("");
    try {
      const result = await provisionEmployeeAccount(employee, { ...form, username, email: `${username}@borribo.com.kh` });
      onSaved?.(result.employee);
      onClose();
    } catch (submitError) {
      const message = String(submitError?.message || "");
      if (/EMAIL_EXISTS/i.test(message)) setError("អ៊ីមែលនេះមាន Account រួចហើយ");
      else if (/USERNAME_EXISTS/i.test(message)) setError("Username នេះមានអ្នកប្រើរួចហើយ");
      else setError(message || "មិនអាចបង្កើត Login Account បានទេ");
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[100] bg-[#111827]/45 p-3 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#EBEDF3]"><div><h2 className="font-bold text-[#1E2333] flex items-center gap-2"><Shield size={18} color={COLORS.primary} />បង្កើត Login Account</h2><p className="text-xs text-[#8A8FA3] mt-1">{employee.name} · {employee.id}</p></div><button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-[#F5F6FA] flex items-center justify-center text-[#8A8FA3]"><X size={17} /></button></div>
      <div className="p-5 grid gap-4">
        {error && <div className="text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-4 py-3">{error}</div>}
        <div><FieldLabel required>Username</FieldLabel><TextField dir="ltr" value={form.username} onChange={update("username")} placeholder="bora.chhun" /></div>
        <div><FieldLabel required>Password បណ្ដោះអាសន្ន</FieldLabel><div className="relative"><TextField dir="ltr" type={showPassword ? "text" : "password"} value={form.password} onChange={update("password")} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8FA3]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        <div><FieldLabel>Role</FieldLabel><SelectField options={["employee", "hr", "admin"]} value={form.role} onChange={update("role")} /></div>
        <div className="text-xs text-[#8A8FA3]">Email Login: <span dir="ltr" className="font-medium text-[#2A3F8F]">{form.username.trim().toLowerCase() || "username"}@borribo.com.kh</span></div>
      </div>
      <div className="border-t border-[#EBEDF3] px-5 py-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#EBEDF3] px-4 py-2.5 text-sm text-[#5B5F73]">បោះបង់</button><button type="button" disabled={saving} onClick={submit} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60" style={{ background: COLORS.primary }}><Save size={16} />{saving ? "កំពុងបង្កើត..." : "បង្កើត Account"}</button></div>
    </div>
  </div>;
}
