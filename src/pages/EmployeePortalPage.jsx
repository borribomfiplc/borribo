import React, { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, query, where } from "firebase/firestore";
import { CalendarDays, FileText, LogOut, MapPin, Clock3, ScanLine, Info, Download, XCircle } from "lucide-react";
import { db } from "../firebase/config";
import { COLORS } from "../data/theme";
import { attendanceHistoryRecord, calculateAttendanceMetrics, DEFAULT_WORKING_HOURS, distanceInMeters, timeNow, todayISO } from "../utils/attendance";
import { parseQrPayload, sha256 } from "../utils/qrSecurity";
import QrScanner from "../components/QrScanner";
import { correctionStatusStyle, leaveQuotas, leaveTypes } from "../data/mockData";
import { notifyTelegram } from "../services/telegram";
import { calculateLeaveDays, LEAVE_PORTIONS, leaveRequestsConflict, remainingLeaveDays } from "../utils/leave";
import { downloadLeaveAttachment } from "../services/leaveAttachments";
const configuredValue = (primary, fallback = "") => String(primary ?? "").trim() === "" ? fallback : primary;
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

export default function EmployeePortalPage({ authUser, profile, onLogout, branches = [], holidays = [] }) {
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [form, setForm] = useState({ leaveType: leaveTypes[0], startDate: "", endDate: "", portion: LEAVE_PORTIONS[0], reason: "" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const employeeId = profile.employeeId || authUser.uid;
  const dateISO = todayISO();
  const attendanceId = `${employeeId}_${dateISO}`;
  const leaveYear = (form.startDate || dateISO).slice(0, 4);
  const leaveDays = useMemo(() => calculateLeaveDays(form.startDate, form.endDate, form.portion, holidays), [form.startDate, form.endDate, form.portion, holidays]);
  const remainingForType = remainingLeaveDays(requests, employeeId, form.leaveType, { year: leaveYear, holidays });

  useEffect(() => {
    const q = query(collection(db, "leaveRequests"), where("employeeUid", "==", authUser.uid));
    return onSnapshot(q, (snap) => setRequests(snap.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setError("មិនអាចទាញយកសំណើច្បាប់បានទេ"));
  }, [authUser.uid]);

  useEffect(() => onSnapshot(doc(db, "attendanceToday", attendanceId), (snap) => setAttendance(snap.exists() ? snap.data() : null)), [attendanceId]);

  const validateAttendanceRequirements = async (location) => {
    const settingsSnap = await getDoc(doc(db, "settings", "gpsQrPublic"));
    if (!settingsSnap.exists()) throw new Error("GPS/QR មិនទាន់បានកំណត់សុវត្ថិភាព។ សូមឲ្យ HR បើកទំព័រ GPS និង QR ហើយចុចរក្សាទុក");
    const settings = settingsSnap.data();
    const branch = branches.find((item) => (
      (profile.branchId && item.id === profile.branchId) || item.name === profile.branch
    ));
    if (!branch) throw new Error("រកមិនឃើញសាខារបស់អ្នក។ សូមទាក់ទង HR");
    if (branch.status === "អសកម្ម") throw new Error("សាខារបស់អ្នកត្រូវបានដាក់អសកម្ម។ សូមទាក់ទង HR");
    const savedGeofence = settings.branchGeofences?.[branch.id] || {};
    const radius = Number(
      branch.gpsRadiusMeters
      || savedGeofence.radiusMeters
      || settings.radii?.[branch.id]
      || 100,
    );
    if (settings.requireGps) {
      if (location.gpsStatus !== "recorded") throw new Error("សូមអនុញ្ញាត GPS មុនពេលកត់ត្រាវត្តមាន");
      const branchLocation = {
        latitude: configuredValue(branch.latitude, configuredValue(savedGeofence.latitude, settings.locations?.[branch.id]?.latitude ?? "")),
        longitude: configuredValue(branch.longitude, configuredValue(savedGeofence.longitude, settings.locations?.[branch.id]?.longitude ?? "")),
      };
      if (String(branchLocation.latitude ?? "").trim() === ""
        || String(branchLocation.longitude ?? "").trim() === ""
        || !Number.isFinite(Number(branchLocation.latitude))
        || !Number.isFinite(Number(branchLocation.longitude))) {
        throw new Error("សាខារបស់អ្នកមិនទាន់កំណត់ទីតាំង GPS ទេ។ សូមទាក់ទង HR");
      }
      const maxAccuracy = Number(settings.maxGpsAccuracy || 100);
      if (!Number.isFinite(location.accuracy) || location.accuracy > maxAccuracy) throw new Error(`GPS មិនទាន់ច្បាស់ (${location.accuracy ?? "—"}m)។ សូមចេញទៅកន្លែងបើកចំហ ហើយសាកម្ដងទៀត`);
      const meters = distanceInMeters(location, branchLocation);
      if (meters === null || meters > radius) throw new Error(`អ្នកស្ថិតនៅក្រៅតំបន់សាខា (${meters ?? "—"}m / ${radius}m)`);
      location.distanceMeters = meters;
      location.allowedRadiusMeters = radius;
      location.verifiedBranchId = branch.id;
      location.verifiedBranchName = branch.name;
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
    settings.verifiedBranch = { id: branch.id, name: branch.name, radiusMeters: radius };
    return settings;
  };

  const handleQrResult = useCallback((value) => {
    setQrValue(value); setAttendanceMessage("ស្កេន QR បានជោគជ័យ"); setError(""); setScanning(false);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim() || leaveDays < 0.5) {
      setError("សូមបំពេញកាលបរិច្ឆេទ និងហេតុផលឱ្យត្រឹមត្រូវ");
      return;
    }
    if (form.portion !== "ពេញថ្ងៃ" && form.startDate !== form.endDate) {
      setError("ច្បាប់កន្លះថ្ងៃអាចជ្រើសបានតែមួយថ្ងៃប៉ុណ្ណោះ");
      return;
    }
    const duplicate = requests.some((request) =>
      ["រង់ចាំពិនិត្យ", "បានអនុម័ត"].includes(request.status) &&
      leaveRequestsConflict(form, request));
    if (duplicate) {
      setError("មានសំណើរង់ចាំ ឬបានអនុម័តជាន់គ្នាជាមួយកាលបរិច្ឆេទនេះរួចហើយ");
      return;
    }
    if (leaveQuotas[form.leaveType] > 0 && remainingForType != null && leaveDays > remainingForType) {
      setError(`សមតុល្យ ${form.leaveType} នៅសល់តែ ${remainingForType} ថ្ងៃ`);
      return;
    }
    setSaving(true); setError("");
    try {
      const requestRef = doc(collection(db, "leaveRequests"));
      const documentRequired = form.leaveType === "ច្បាប់ឈឺ" && leaveDays > 1;
      await setDoc(requestRef, {
        employeeUid: authUser.uid, employeeId, name: profile.name || authUser.email,
        branch: profile.branch || "", role: profile.jobRole || "បុគ្គលិក", leaveType: form.leaveType,
        startDate: form.startDate, endDate: form.endDate, days: leaveDays, leaveYear,
        portion: form.portion, reason: form.reason.trim(), status: "រង់ចាំពិនិត្យ", requestedOn: dateISO,
        requestedAt: serverTimestamp(),
        documentRequired,
        documentReceiptStatus: documentRequired ? "មិនទាន់ទទួល" : "មិនត្រូវការ",
      });
      await notifyTelegram("leave_request", requestRef.id);
      setForm({ leaveType: leaveTypes[0], startDate: "", endDate: "", portion: LEAVE_PORTIONS[0], reason: "" });
      setShowForm(false);
    } catch (submitError) { setError(submitError.message || "មិនអាចរក្សាទុកសំណើបានទេ។ សូមព្យាយាមម្ដងទៀត។"); }
    finally { setSaving(false); }
  };

  const cancelRequest = async (request) => {
    if (request.status !== "រង់ចាំពិនិត្យ" || !window.confirm("តើអ្នកចង់លុបចោលសំណើនេះមែនទេ?")) return;
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "leaveRequests", request.id), { status: "បានលុបចោល", cancelledOn: dateISO, cancelledAt: serverTimestamp() });
    } catch { setError("មិនអាចលុបចោលសំណើបានទេ"); }
    finally { setSaving(false); }
  };

  const downloadAttachment = async (file) => {
    try { await downloadLeaveAttachment(file); }
    catch { setError("មិនអាចទាញយកឯកសារភ្ជាប់បានទេ"); }
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
        role: profile.jobRole || "បុគ្គលិក", branch: settings.verifiedBranch?.name || profile.branch || "",
        branchId: settings.verifiedBranch?.id || profile.branchId || "", shift: employeeShift,
        updatedAt: serverTimestamp(),
      };
      let nextRecord;
      if (kind === "in") {
        const metrics = calculateAttendanceMetrics({ shift: employeeShift, workingHours, checkInAt: capturedAt });
        nextRecord = {
          ...base, checkIn: now, checkInAt: serverTimestamp(), checkInClientAt: capturedAt.toISOString(),
          checkInLocation: location, gpsStatus: location.gpsStatus, checkOut: "—", ...metrics,
          qrVerified: Boolean(settings.requireQr), qrBranchId: settings.verifiedQr?.branchId || "", qrExpiresAt: settings.verifiedQr?.expiresAt || "", gpsVerified: Boolean(settings.requireGps), source: "mobile",
        };
        setAttendanceMessage(`Check-in ជោគជ័យ នៅម៉ោង ${now}${metrics.isLate ? ` · មកយឺត ${metrics.lateMinutes} នាទី` : ""}`);
      } else {
        const metrics = calculateAttendanceMetrics({ shift: employeeShift, workingHours, checkInAt: attendance?.checkInClientAt, checkOutAt: capturedAt });
        nextRecord = {
          ...base, checkOut: now, checkOutAt: serverTimestamp(), checkOutClientAt: capturedAt.toISOString(),
          checkOutLocation: location, gpsStatus: location.gpsStatus,
          ...metrics,
          qrVerified: Boolean(settings.requireQr), qrBranchId: settings.verifiedQr?.branchId || "", qrExpiresAt: settings.verifiedQr?.expiresAt || "", gpsVerified: Boolean(settings.requireGps), source: "mobile",
        };
        setAttendanceMessage(`Check-out ជោគជ័យ នៅម៉ោង ${now}${metrics.isEarlyLeave ? ` · ចេញមុន ${metrics.earlyLeaveMinutes} នាទី` : ""}`);
      }
      const mergedRecord = { ...attendance, ...nextRecord };
      await Promise.all([
        setDoc(doc(db, "attendanceToday", attendanceId), nextRecord, { merge: true }),
        setDoc(doc(db, "attendanceHistory", attendanceId), attendanceHistoryRecord(mergedRecord), { merge: true }),
      ]);
      await notifyTelegram(kind === "in" ? "check_in" : "check_out", attendanceId);
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

        <div className="flex items-start justify-between gap-3 mb-4">
          <div><h2 className="font-bold text-[#1E2333]">សំណើច្បាប់</h2><p className="text-xs text-[#8A8FA3] mt-1">បុគ្គលិក → HR/Admin</p></div>
          <button onClick={() => { setError(""); setShowForm((value) => !value); }} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold flex items-center gap-2" style={{ background: COLORS.primary }}><FileText size={16} /> ស្នើសុំច្បាប់</button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-white rounded-2xl border border-[#EBEDF3] p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-[#5B5F73]">ប្រភេទច្បាប់
              <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none">{leaveTypes.map((type) => <option key={type}>{type}</option>)}</select>
              <span className="block text-[11px] text-[#8A8FA3] mt-1">សមតុល្យឆ្នាំ {leaveYear} នៅសល់៖ {leaveQuotas[form.leaveType] === 0 ? "មិនកំណត់" : `${remainingForType} ថ្ងៃ`}</span>
            </label>
            <label className="text-sm text-[#5B5F73]">រយៈពេល
              <select value={form.portion} onChange={(e) => { const portion = e.target.value; setForm({ ...form, portion, endDate: portion === "ពេញថ្ងៃ" ? form.endDate : form.startDate }); }} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none">{LEAVE_PORTIONS.map((portion) => <option key={portion}>{portion}</option>)}</select>
            </label>
            <label className="text-sm text-[#5B5F73]">ថ្ងៃចាប់ផ្ដើម<input required type="date" value={form.startDate} onChange={(e) => { const startDate = e.target.value; setForm({ ...form, startDate, endDate: form.portion === "ពេញថ្ងៃ" && form.endDate >= startDate ? form.endDate : startDate }); }} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label>
            <label className="text-sm text-[#5B5F73]">ថ្ងៃបញ្ចប់<input required disabled={form.portion !== "ពេញថ្ងៃ"} type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1.5 w-full rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none disabled:opacity-60" /></label>
            <div className="sm:col-span-2 rounded-xl border border-[#C9D3F2] bg-[#EEF1FB] px-4 py-3 flex items-center justify-between gap-3"><div><div className="text-xs text-[#5B5F73]">ចំនួនថ្ងៃធ្វើការសរុប (មិនរាប់ថ្ងៃអាទិត្យ និងថ្ងៃឈប់សាធារណៈ)</div><div className="mt-0.5 text-xl font-bold text-[#2A3F8F]">{leaveDays || "—"} ថ្ងៃ</div></div><CalendarDays size={24} className="text-[#2A3F8F] shrink-0" /></div>
            <div className="sm:col-span-2 rounded-xl bg-[#FDF3E3] px-4 py-3 text-xs text-[#8A6518] flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0" /><span>Upload ឯកសារត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន។ បើជាច្បាប់ឈឺលើស ១ ថ្ងៃ សូមប្រគល់លិខិតពេទ្យជូន HR ដោយផ្ទាល់។ HR នឹងសម្គាល់ថាបានទទួលក្នុងប្រព័ន្ធ។</span></div>
            <label className="text-sm text-[#5B5F73] sm:col-span-2">ហេតុផល<textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1.5 w-full min-h-24 rounded-xl bg-[#F5F6FA] px-3 py-2.5 outline-none" /></label>
            {error && <p className="sm:col-span-2 text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-3 py-2">{error}</p>}
            <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[#EBEDF3] px-4 py-2.5 text-sm">បោះបង់</button><button disabled={saving} className="rounded-xl px-4 py-2.5 text-white text-sm font-semibold disabled:opacity-60" style={{ background: COLORS.primary }}>{saving ? "កំពុងរក្សាទុក..." : "បញ្ជូនសំណើ"}</button></div>
          </form>
        )}
        {error && !showForm && <p className="mb-4 text-sm text-[#D9614F] bg-[#FBEBE8] rounded-xl px-3 py-2">{error}</p>}
        <div className="bg-white rounded-2xl border border-[#EBEDF3] overflow-hidden">
          <div className="p-5 flex items-center gap-2 font-semibold text-[#1E2333]"><CalendarDays size={18} className="text-[#2A3F8F]" /> សំណើច្បាប់របស់ខ្ញុំ</div>
          <div className="divide-y divide-[#EBEDF3]">{requests.length === 0 ? <p className="p-6 text-sm text-[#8A8FA3] text-center">មិនទាន់មានសំណើច្បាប់ទេ</p> : requests.map((request) => {
            const style = correctionStatusStyle[request.status] || correctionStatusStyle["រង់ចាំពិនិត្យ"];
            return <div key={request.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-[#1E2333]">{request.leaveType}</p><p className="text-xs text-[#8A8FA3] mt-1">{request.startDate} — {request.endDate} · {request.days || 1} ថ្ងៃ{request.portion && request.portion !== "ពេញថ្ងៃ" ? ` · ${request.portion}` : ""}</p>{request.decisionReason && <p className="text-xs text-[#5B5F73] mt-2">មតិ HR/Admin៖ {request.decisionReason}</p>}<div className="flex gap-2 mt-2">{request.attachment && <button type="button" onClick={() => downloadAttachment(request.attachment)} className="text-xs text-[#2A3F8F] flex items-center gap-1"><Download size={13} /> {request.attachment.name}</button>}{request.status === "រង់ចាំពិនិត្យ" && <button disabled={saving} type="button" onClick={() => cancelRequest(request)} className="text-xs text-[#D9614F] flex items-center gap-1"><XCircle size={13} /> លុបចោល</button>}</div></div><span className="h-fit rounded-full px-2.5 py-1 text-xs font-medium shrink-0" style={{ background: style.bg, color: style.fg }}>{request.status}</span></div>;
          })}</div>
        </div>
      </div>
      {scanning && <QrScanner onResult={handleQrResult} onClose={() => setScanning(false)} />}
    </div>
  );
}
