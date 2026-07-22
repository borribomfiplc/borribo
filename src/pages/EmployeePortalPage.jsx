import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, query, where } from "firebase/firestore";
import { CalendarDays, FileText, LogOut, MapPin, Clock3, ScanLine } from "lucide-react";
import { db } from "../firebase/config";
import { COLORS } from "../data/theme";
import { attendanceHistoryRecord, calculateAttendanceMetrics, DEFAULT_WORKING_HOURS, distanceInMeters, timeNow, todayISO } from "../utils/attendance";
import { parseQrPayload, sha256 } from "../utils/qrSecurity";
import QrScanner from "../components/QrScanner";
import { leaveTypes } from "../data/mockData";

const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const total = Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
  return Math.max(0, total);
};
function readLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ gpsStatus: "not-supported" });
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ gpsStatus: "recorded", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: Math.round(position.coords.accuracy), capturedAt: new Date(position.timestamp).toISOString() }),
      (locationError) => resolve({ gpsStatus: locationError.code === 1 ? "permission-denied" : "not-available" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function EmployeePortalPage({ authUser, profile, onLogout, branches = [] }) {
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [form, setForm] = useState({ leaveType: leaveTypes[0], startDate: "", endDate: "", reason: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const employeeId = profile.employeeId || authUser.uid;
  const dateISO = todayISO();
  const attendanceId = `${employeeId}_${dateISO}`;
  const leaveDays = useMemo(() => daysBetween(form.startDate, form.endDate), [form.startDate, form.endDate]);

  useEffect(() => {
    const q = query(collection(db, "leaveRequests"), where("employeeUid", "==", authUser.uid));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setError("មិនអាចទាញយកសំណើច្បាប់បានទេ"));
  }, [authUser.uid]);

  useEffect(() => onSnapshot(doc(db, "attendanceToday", attendanceId), (snap) => setAttendance(snap.exists() ? snap.data() : null)), [attendanceId]);

  const validateAttendanceRequirements = async (location) => {
    const settingsSnap = await getDoc(doc(db, "settings", "gpsQrPublic"));
    if (!settingsSnap.exists()) throw new Error("GPS/QR មិនទាន់បានកំណត់សុវត្ថិភាព។ សូមឲ្យ HR បើកទំព័រ GPS និង QR ហើយចុចរក្សាទុក");
    const settings = settingsSnap.data();
    const branch = branches.find((item) => item.name === profile.branch);
    if (!branch) throw new Error("រកមិនឃើញសាខារបស់អ្នក។ សូមទាក់ទង HR");
    const radius = Number(settings.radii?.[branch?.id] || 150);
    if (settings.requireGps) {
      if (location.gpsStatus !== "recorded") throw new Error("សូមអនុញ្ញាត GPS មុនពេលកត់ត្រាវត្តមាន");
      const branchLocation = settings.locations?.[branch?.id];
      if (!branchLocation?.latitude || !branchLocation?.longitude) throw new Error("សាខារបស់អ្នកមិនទាន់កំណត់ទីតាំង GPS ទេ។ សូមទាក់ទង HR");
      const maxAccuracy = Number(settings.maxGpsAccuracy || 100);
      if (!Number.isFinite(location.accuracy) || location.accuracy > maxAccuracy) throw new Error(`GPS មិនទាន់ច្បាស់ (${location.accuracy ?? "—"}m)។ សូមចេញទៅកន្លែងបើកចំហ ហើយសាកម្ដងទៀត`);
      const meters = distanceInMeters(location, branchLocation);
      if (meters === null || meters > radius) throw new Error(`អ្នកស្ថិតនៅក្រៅតំបន់សាខា (${meters ?? "—"}m / ${radius}m)`);
      location.distanceMeters = meters;
      location.allowedRadiusMeters = radius;
    }
    if (settings.requireQr) {
      if (!qrValue.trim()) throw new Error("សូមស្កេន ឬបញ្ចូល QR code របស់សាខា");
      const payload = parseQrPayload(qrValue);
      if (!payload || payload.branchId !== branch.id) throw new Error("QR code មិនត្រឹមត្រូវ ឬមិនមែនរបស់សាខានេះទេ");
      const tokenSnap = await getDoc(doc(db, "qrTokens", branch.id));
      if (!tokenSnap.exists()) throw new Error("QR សាខានេះមិនទាន់ត្រូវបានដំណើរការ។ សូមទាក់ទង HR");
      const token = tokenSnap.data();
      if (token.expiresAt !== payload.expiresAt || new Date(token.expiresAt).getTime() <= Date.now()) throw new Error("QR code បានផុតកំណត់។ សូមស្កេន QR ថ្មីនៅសាខា");
      if (await sha256(payload.token) !== token.tokenHash) throw new Error("QR code មិនត្រឹមត្រូវ ឬត្រូវបានប្ដូររួចហើយ");
      settings.verifiedQr = { branchId: branch.id, expiresAt: token.expiresAt, version: token.version || 1 };
    }
    return settings;
  };

  const handleQrResult = useCallback((value) => {
    setQrValue(value); setAttendanceMessage("ស្កេន QR បានជោគជ័យ"); setError(""); setScanning(false);
  }, []);

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
    if ((kind === "in" && attendance?.checkIn && attendance.checkIn !== "—") || (kind === "out" && (!attendance?.checkIn || attendance.checkIn === "—" || (attendance?.checkOut && attendance.checkOut !== "—")))) return;
    setSaving(true); setError(""); setAttendanceMessage("");
    try {
      const location = await readLocation();
      const settings = await validateAttendanceRequirements(location);
      const capturedAt = new Date();
      const now = timeNow(capturedAt);
      const workingHoursSnap = await getDoc(doc(db, "settings", "workingHours"));
      const workingHours = workingHoursSnap.exists() ? workingHoursSnap.data() : DEFAULT_WORKING_HOURS;
      let employeeShift = profile.shift || "ព្រឹក";
      try {
        const employeeSnap = await getDoc(doc(db, "employees", employeeId));
        if (employeeSnap.exists()) employeeShift = employeeSnap.data().shift || employeeShift;
      } catch {
        // A legacy profile may not have an employee directory record yet.
        // Attendance still uses the profile/default shift instead of failing.
      }
      const base = {
        id: employeeId, recordId: attendanceId, uid: authUser.uid, dateISO, name: profile.name || authUser.email,
        role: profile.jobRole || "បុគ្គលិក", branch: profile.branch || "", shift: employeeShift,
        updatedAt: serverTimestamp(),
      };
      let nextRecord;
      if (kind === "in") {
        const metrics = calculateAttendanceMetrics({ shift: employeeShift, workingHours, checkInAt: capturedAt });
        nextRecord = {
          ...base, checkIn: now, checkInAt: serverTimestamp(), checkInClientAt: capturedAt.toISOString(),
          checkInLocation: location, gpsStatus: location.gpsStatus, checkOut: "—", ...metrics,
          qrVerified: Boolean(settings.requireQr), qrBranchId: settings.verifiedQr?.branchId || "", qrExpiresAt: settings.verifiedQr?.expiresAt || "", gpsVerified: Boolean(settings.requireGps),
        };
        setAttendanceMessage(`Check-in ជោគជ័យ នៅម៉ោង ${now}${metrics.isLate ? ` · មកយឺត ${metrics.lateMinutes} នាទី` : ""}`);
      } else {
        const metrics = calculateAttendanceMetrics({ shift: employeeShift, workingHours, checkInAt: attendance?.checkInClientAt, checkOutAt: capturedAt });
        nextRecord = {
          ...base, checkOut: now, checkOutAt: serverTimestamp(), checkOutClientAt: capturedAt.toISOString(),
          checkOutLocation: location, gpsStatus: location.gpsStatus,
          ...metrics,
          qrVerified: Boolean(settings.requireQr), qrBranchId: settings.verifiedQr?.branchId || "", qrExpiresAt: settings.verifiedQr?.expiresAt || "", gpsVerified: Boolean(settings.requireGps),
        };
        setAttendanceMessage(`Check-out ជោគជ័យ នៅម៉ោង ${now}${metrics.isEarlyLeave ? ` · ចេញមុន ${metrics.earlyLeaveMinutes} នាទី` : ""}`);
      }
      const mergedRecord = { ...attendance, ...nextRecord };
      await Promise.all([
        setDoc(doc(db, "attendanceToday", attendanceId), nextRecord, { merge: true }),
        setDoc(doc(db, "attendanceHistory", attendanceId), attendanceHistoryRecord(mergedRecord), { merge: true }),
      ]);
      if (settings.requireQr) setQrValue("");
    } catch (err) { setError(err.message || "មិនអាចរក្សាទុកវត្តមានបានទេ។ សូមព្យាយាមម្ដងទៀត។"); }
    finally { setSaving(false); }
  };

  const checkedIn = Boolean(attendance?.checkIn && attendance.checkIn !== "—");
  const checkedOut = Boolean(attendance?.checkOut && attendance.checkOut !== "—");

  return (
    <div className="min-h-screen bg-[#F5F6FA] p-4 sm:p-7" style={{ fontFamily: "'Noto Sans Khmer','Inter',sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6"><div className="min-w-0"><h1 className="truncate text-lg sm:text-[22px] font-bold text-[#1E2333]">សួស្តី {profile.name || authUser.email}</h1><p className="text-sm text-[#8A8FA3] mt-1">វត្តមាន និងសំណើច្បាប់របស់អ្នក</p></div><button onClick={onLogout} className="shrink-0 rounded-xl border border-[#EBEDF3] bg-white px-3 py-2 text-sm text-[#5B5F73] flex gap-2 items-center"><LogOut size={16} /> ចាកចេញ</button></div>

        <section className="bg-white rounded-2xl border border-[#EBEDF3] p-4 sm:p-5 mb-5"><div className="flex items-center gap-2 font-semibold text-[#1E2333]"><Clock3 size={18} className="text-[#2A3F8F]" /> វត្តមានថ្ងៃនេះ</div><p className="text-xs text-[#8A8FA3] mt-1">{dateISO}{attendance?.gpsStatus === "recorded" ? ` · GPS ${attendance.checkInLocation?.distanceMeters ?? "—"}m ពីសាខា` : ""}</p><label className="block text-xs text-[#5B5F73] mt-4"><span className="flex items-center gap-1 mb-1.5"><ScanLine size={13} /> QR code សាខា</span><div className="flex flex-col gap-2 min-[380px]:flex-row"><input value={qrValue} onChange={(e) => setQrValue(e.target.value)} placeholder={qrValue ? "បានស្កេន QR" : "ស្កេន QR មុន Check-in/out"} className="min-w-0 flex-1 rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /><button type="button" onClick={() => { setError(""); setScanning(true); }} className="shrink-0 rounded-xl px-3 py-2.5 text-xs font-medium text-white" style={{ background: COLORS.primary }}>ស្កេន QR</button></div></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"><button disabled={saving || checkedIn} onClick={() => markAttendance("in")} className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: COLORS.primary }}>{saving && !checkedIn ? "កំពុងកត់ត្រា..." : checkedIn ? `បាន Check-in ${attendance.checkIn}` : "Check-in"}</button><button disabled={saving || !checkedIn || checkedOut} onClick={() => markAttendance("out")} className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: COLORS.green }}>{saving && checkedIn ? "កំពុងកត់ត្រា..." : checkedOut ? `បាន Check-out ${attendance.checkOut}` : "Check-out"}</button></div>{checkedIn && <div className="mt-3 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-[#F5F6FA] px-3 py-2 text-[#5B5F73]">ចូល: <span className="font-semibold text-[#1E2333]">{attendance.checkIn}</span></div><div className="rounded-xl bg-[#F5F6FA] px-3 py-2 text-[#5B5F73]">រយៈពេល: <span className="font-semibold text-[#1E2333]">{attendance.hours || "កំពុងធ្វើការ"}</span></div></div>}{attendance && (attendance.isLate || attendance.isEarlyLeave) && <p className="mt-3 text-xs text-[#B97913]">{attendance.isLate ? `មកយឺត ${attendance.lateMinutes} នាទី` : ""}{attendance.isLate && attendance.isEarlyLeave ? " · " : ""}{attendance.isEarlyLeave ? `ចេញមុន ${attendance.earlyLeaveMinutes} នាទី` : ""}</p>}{attendanceMessage && <p className="mt-3 text-sm text-[#3FA66B] bg-[#E9F7EF] rounded-xl px-3 py-2">{attendanceMessage}</p>}{error && <p className="mt-3 text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-3 py-2">{error}</p>}<p className="text-xs text-[#8A8FA3] mt-3 flex items-center gap-1"><MapPin size={13} /> Browser នឹងស្នើសុំ GPS នៅពេល Check-in និង Check-out</p></section>

        <div className="flex items-start justify-between gap-3 mb-4"><div><h2 className="font-bold text-[#1E2333]">សំណើច្បាប់</h2><p className="text-xs text-[#8A8FA3] mt-1">ស្នើ និងតាមដានស្ថានភាពសំណើរបស់អ្នក</p></div><button onClick={() => setShowForm((value) => !value)} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2" style={{ background: COLORS.primary }}><FileText size={16} /> ស្នើសុំច្បាប់</button></div>
        {showForm && <form onSubmit={submit} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-sm text-[#5B5F73]">ប្រភេទច្បាប់<select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none">{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-sm text-[#5B5F73]">ថ្ងៃចាប់ផ្ដើម<input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label><label className="text-sm text-[#5B5F73]">ថ្ងៃបញ្ចប់<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label><div className="text-sm text-[#5B5F73]">ចំនួនថ្ងៃ<div className="mt-1.5 rounded-xl bg-[#F5F6FA] px-3 py-2.5 text-[#1E2333]">{leaveDays || "—"} ថ្ងៃ</div></div><label className="text-sm text-[#5B5F73] sm:col-span-2">ហេតុផល<textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1.5 w-full min-h-24 rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label>{error && <p className="sm:col-span-2 text-sm text-[#D9614F]">{error}</p>}<div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#EBEDF3] px-4 py-2.5 text-sm">បោះបង់</button><button disabled={saving} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary }}>{saving ? "កំពុងរក្សាទុក..." : "បញ្ជូនសំណើ"}</button></div></form>}
        {error && !showForm && <p className="mb-4 text-sm text-[#D9614F]">{error}</p>}
        <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden"><div className="p-5 flex items-center gap-2 font-semibold text-[#1E2333]"><CalendarDays size={18} className="text-[#2A3F8F]" /> សំណើច្បាប់របស់ខ្ញុំ</div><div className="divide-y divide-[#EBEDF3]">{requests.length === 0 ? <p className="p-6 text-sm text-[#8A8FA3] text-center">មិនទាន់មានសំណើច្បាប់ទេ</p> : requests.map((request) => <div key={request.id} className="p-4 sm:px-5 flex justify-between gap-4"><div><p className="font-medium text-[#1E2333]">{request.leaveType}</p><p className="text-xs text-[#8A8FA3] mt-1">{request.startDate} — {request.endDate} · {request.days || 1} ថ្ងៃ</p></div><span className="h-fit rounded-full bg-[#FDF3E3] text-[#B97913] px-2.5 py-1 text-xs font-medium">{request.status}</span></div>)}</div></div>
      </div>
      {scanning && <QrScanner onResult={handleQrResult} onClose={() => setScanning(false)} />}
    </div>
  );
}
