import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, query, where } from "firebase/firestore";
import { CalendarDays, FileText, LogOut, MapPin, Clock3 } from "lucide-react";
import { db } from "../firebase/config";
import { COLORS } from "../data/theme";

const leaveTypes = ["ច្បាប់ប្រចាំឆ្នាំ", "ច្បាប់ឈឺ", "ច្បាប់ពិសេស"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const total = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
  return Math.max(0, total);
};
const timeNow = () => new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());

function readLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ gpsStatus: "not-supported" });
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ gpsStatus: "recorded", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) }),
      () => resolve({ gpsStatus: "not-available" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export default function EmployeePortalPage({ authUser, profile, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [form, setForm] = useState({ leaveType: leaveTypes[0], startDate: "", endDate: "", reason: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const employeeId = profile.employeeId || authUser.uid;
  const dateISO = todayISO();
  const attendanceId = `${employeeId}_${dateISO}`;
  const leaveDays = useMemo(() => daysBetween(form.startDate, form.endDate), [form.startDate, form.endDate]);

  useEffect(() => {
    const q = query(collection(db, "leaveRequests"), where("employeeUid", "==", authUser.uid));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setError("មិនអាចទាញយកសំណើច្បាប់បានទេ"));
  }, [authUser.uid]);

  useEffect(() => onSnapshot(doc(db, "attendanceToday", attendanceId), (snap) => setAttendance(snap.exists() ? snap.data() : null)), [attendanceId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim() || leaveDays < 1) {
      setError("សូមបំពេញកាលបរិច្ឆេទ និងហេតុផលឱ្យត្រឹមត្រូវ");
      return;
    }
    setSaving(true); setError("");
    try {
      await addDoc(collection(db, "leaveRequests"), {
        employeeUid: authUser.uid, employeeId, name: profile.name || authUser.email,
        branch: profile.branch || "", role: profile.role, leaveType: form.leaveType,
        startDate: form.startDate, endDate: form.endDate, days: leaveDays,
        reason: form.reason.trim(), status: "រង់ចាំពិនិត្យ", requestedOn: dateISO,
        requestedAt: serverTimestamp(),
      });
      setForm({ leaveType: leaveTypes[0], startDate: "", endDate: "", reason: "" }); setShowForm(false);
    } catch { setError("មិនអាចរក្សាទុកសំណើបានទេ។ សូមព្យាយាមម្ដងទៀត។"); }
    finally { setSaving(false); }
  };

  const markAttendance = async (kind) => {
    setSaving(true); setError("");
    try {
      const location = await readLocation();
      const now = timeNow();
      const base = {
        id: employeeId, recordId: attendanceId, uid: authUser.uid, dateISO, name: profile.name || authUser.email,
        role: profile.jobRole || "បុគ្គលិក", branch: profile.branch || "", shift: "ព្រឹក",
        status: "មានវត្តមាន", ...location, updatedAt: serverTimestamp(),
      };
      if (kind === "in") {
        await setDoc(doc(db, "attendanceToday", attendanceId), { ...base, checkIn: now, checkInAt: serverTimestamp(), checkOut: "—", hours: "កំពុងធ្វើការ" }, { merge: true });
      } else {
        await setDoc(doc(db, "attendanceToday", attendanceId), { ...base, checkOut: now, checkOutAt: serverTimestamp(), hours: "បាន Check-out" }, { merge: true });
      }
    } catch { setError("មិនអាចរក្សាទុកវត្តមានបានទេ។ សូមព្យាយាមម្ដងទៀត។"); }
    finally { setSaving(false); }
  };

  const checkedIn = Boolean(attendance?.checkIn && attendance.checkIn !== "—");
  const checkedOut = Boolean(attendance?.checkOut && attendance.checkOut !== "—");

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 sm:p-7" style={{ fontFamily: "'Noto Sans Khmer','Inter',sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6"><div><h1 className="text-lg sm:text-[22px] font-bold text-[#1E2333]">សួស្តី {profile.name || authUser.email}</h1><p className="text-sm text-[#8A8FA3] mt-1">វត្តមាន និងសំណើច្បាប់របស់អ្នក</p></div><button onClick={onLogout} className="rounded-xl border border-[#EBEDF3] bg-white px-3 py-2 text-sm text-[#5B5F73] flex gap-2 items-center"><LogOut size={16} /> ចាកចេញ</button></div>

        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5"><div className="flex items-center gap-2 font-semibold text-[#1E2333]"><Clock3 size={18} className="text-[#2A3F8F]" /> វត្តមានថ្ងៃនេះ</div><p className="text-xs text-[#8A8FA3] mt-1">{dateISO}{attendance?.gpsStatus === "recorded" ? " · GPS បានកត់ត្រា" : ""}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"><button disabled={saving || checkedIn} onClick={() => markAttendance("in")} className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: COLORS.primary }}>{checkedIn ? `បាន Check-in ${attendance.checkIn}` : "Check-in"}</button><button disabled={saving || !checkedIn || checkedOut} onClick={() => markAttendance("out")} className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: COLORS.green }}>{checkedOut ? `បាន Check-out ${attendance.checkOut}` : "Check-out"}</button></div><p className="text-xs text-[#8A8FA3] mt-3 flex items-center gap-1"><MapPin size={13} /> Browser នឹងស្នើសុំទីតាំង GPS ពេល Check-in/Check-out</p></section>

        <div className="flex items-start justify-between gap-3 mb-4"><div><h2 className="font-bold text-[#1E2333]">សំណើច្បាប់</h2><p className="text-xs text-[#8A8FA3] mt-1">ស្នើ និងតាមដានស្ថានភាពសំណើរបស់អ្នក</p></div><button onClick={() => setShowForm((value) => !value)} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2" style={{ background: COLORS.primary }}><FileText size={16} /> ស្នើសុំច្បាប់</button></div>
        {showForm && <form onSubmit={submit} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-sm text-[#5B5F73]">ប្រភេទច្បាប់<select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none">{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-sm text-[#5B5F73]">ថ្ងៃចាប់ផ្ដើម<input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label><label className="text-sm text-[#5B5F73]">ថ្ងៃបញ្ចប់<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label><div className="text-sm text-[#5B5F73]">ចំនួនថ្ងៃ<div className="mt-1.5 rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-[#1E2333]">{leaveDays || "—"} ថ្ងៃ</div></div><label className="text-sm text-[#5B5F73] sm:col-span-2">ហេតុផល<textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1.5 w-full min-h-24 rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label>{error && <p className="sm:col-span-2 text-sm text-[#D9614F]">{error}</p>}<div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#EBEDF3] px-4 py-2.5 text-sm">បោះបង់</button><button disabled={saving} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary }}>{saving ? "កំពុងរក្សាទុក..." : "បញ្ជូនសំណើ"}</button></div></form>}
        {error && !showForm && <p className="mb-4 text-sm text-[#D9614F]">{error}</p>}
        <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="p-5 flex items-center gap-2 font-semibold text-[#1E2333]"><CalendarDays size={18} className="text-[#2A3F8F]" /> សំណើច្បាប់របស់ខ្ញុំ</div><div className="divide-y divide-[#EBEDF3]">{requests.length === 0 ? <p className="p-6 text-sm text-[#8A8FA3] text-center">មិនទាន់មានសំណើច្បាប់ទេ</p> : requests.map((request) => <div key={request.id} className="p-4 sm:px-5 flex justify-between gap-4"><div><p className="font-medium text-[#1E2333]">{request.leaveType}</p><p className="text-xs text-[#8A8FA3] mt-1">{request.startDate} — {request.endDate} · {request.days || 1} ថ្ងៃ</p></div><span className="h-fit rounded-full bg-[#FDF3E3] text-[#B97913] px-2.5 py-1 text-xs font-medium">{request.status}</span></div>)}</div></div>
      </div>
    </div>
  );
}
