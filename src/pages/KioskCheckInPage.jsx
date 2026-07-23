import React, { useState } from "react";
import {
  ScanLine, LogIn, LogOut, X, CheckCircle2, MapPin
} from "lucide-react";
import { COLORS } from "../data/theme";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";
import { calculateAttendanceMetrics, DEFAULT_WORKING_HOURS, distanceInMeters, formatKhmerDate, timeNow, todayISO } from "../utils/attendance";
import { isEmployeeInactive } from "../utils/employeeStatus";
import { notifyTelegram } from "../services/telegram";

const configuredValue = (primary, fallback = "") => String(primary ?? "").trim() === "" ? fallback : primary;

function readLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ gpsStatus: "not-supported" });
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        gpsStatus: "recorded",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
        capturedAt: new Date(position.timestamp).toISOString(),
      }),
      (locationError) => resolve({ gpsStatus: locationError.code === 1 ? "permission-denied" : "not-available" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function KioskCheckInPage({ employees, attendanceToday, setAttendanceToday, attendanceHistory, setAttendanceHistory, branches = [], profile, onExit }) {
  const [pin, setPin] = useState("");
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null); // { type: "in" | "out", time }
  const [checking, setChecking] = useState(false);
  const kioskBranch = branches.find((branch) => (
    (profile?.branchId && branch.id === profile.branchId) || branch.name === profile?.branch
  ));
  const employeeBelongsToKioskBranch = (employee) => Boolean(kioskBranch && (
    (employee.branchId && employee.branchId === kioskBranch.id) || employee.branch === kioskBranch.name
  ));

  const todayRecord = matchedEmployee ? attendanceToday.find((a) => a.id === matchedEmployee.id && a.dateISO === todayISO()) : null;

  const reset = () => {
    setPin("");
    setMatchedEmployee(null);
    setError("");
    setMessage(null);
    setChecking(false);
  };

  const pressDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      if (!kioskBranch) {
        setError("Kiosk នេះមិនទាន់ភ្ជាប់សាខា។ សូមឲ្យ Admin កំណត់សាខាសម្រាប់គណនី Kiosk");
        setTimeout(() => setPin(""), 700);
        return;
      }
      const emp = employees.find((e) => (
        e.pin === next && !isEmployeeInactive(e.status) && employeeBelongsToKioskBranch(e)
      ));
      if (emp) {
        setMatchedEmployee(emp);
      } else {
        setError(`លេខកូដមិនត្រឹមត្រូវ ឬបុគ្គលិកមិនស្ថិតក្នុង ${kioskBranch.name}`);
        setTimeout(() => setPin(""), 700);
      }
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  const loadWorkingHours = async () => {
    const snap = await getDoc(doc(db, "settings", "workingHours"));
    return snap.exists() ? snap.data() : DEFAULT_WORKING_HOURS;
  };

  const validateKioskLocation = async () => {
    if (!kioskBranch || kioskBranch.status === "អសកម្ម") {
      throw new Error("សាខារបស់ Kiosk មិនត្រឹមត្រូវ ឬត្រូវបានដាក់អសកម្ម");
    }
    const settingsSnap = await getDoc(doc(db, "settings", "gpsQrPublic"));
    if (!settingsSnap.exists()) throw new Error("GPS មិនទាន់បានកំណត់។ សូមឲ្យ HR រក្សាទុកការកំណត់ GPS និង QR");
    const settings = settingsSnap.data();
    if (!settings.requireGps) return { gpsStatus: "not-required", verifiedBranchId: kioskBranch.id, verifiedBranchName: kioskBranch.name };
    const location = await readLocation();
    if (location.gpsStatus !== "recorded") throw new Error("សូមអនុញ្ញាត GPS សម្រាប់ Kiosk មុនកត់ត្រាវត្តមាន");
    const savedGeofence = settings.branchGeofences?.[kioskBranch.id] || {};
    const branchLocation = {
      latitude: configuredValue(kioskBranch.latitude, configuredValue(savedGeofence.latitude, settings.locations?.[kioskBranch.id]?.latitude ?? "")),
      longitude: configuredValue(kioskBranch.longitude, configuredValue(savedGeofence.longitude, settings.locations?.[kioskBranch.id]?.longitude ?? "")),
    };
    if (String(branchLocation.latitude ?? "").trim() === ""
      || String(branchLocation.longitude ?? "").trim() === ""
      || !Number.isFinite(Number(branchLocation.latitude))
      || !Number.isFinite(Number(branchLocation.longitude))) {
      throw new Error("សាខា Kiosk មិនទាន់កំណត់ Latitude/Longitude");
    }
    const maxAccuracy = Number(settings.maxGpsAccuracy || 100);
    if (!Number.isFinite(location.accuracy) || location.accuracy > maxAccuracy) {
      throw new Error(`GPS Kiosk មិនទាន់ច្បាស់ (${location.accuracy ?? "—"}m)`);
    }
    const radius = Number(kioskBranch.gpsRadiusMeters || savedGeofence.radiusMeters || settings.radii?.[kioskBranch.id] || 100);
    const meters = distanceInMeters(location, branchLocation);
    if (meters === null || meters > radius) throw new Error(`Kiosk នៅក្រៅតំបន់ ${kioskBranch.name} (${meters ?? "—"}m / ${radius}m)`);
    return {
      ...location,
      distanceMeters: meters,
      allowedRadiusMeters: radius,
      verifiedBranchId: kioskBranch.id,
      verifiedBranchName: kioskBranch.name,
    };
  };

  const handleCheckIn = async () => {
    setChecking(true); setError("");
    const capturedAt = new Date();
    const time = timeNow(capturedAt);
    let metrics;
    let location;
    try {
      const [workingHours, verifiedLocation] = await Promise.all([loadWorkingHours(), validateKioskLocation()]);
      metrics = calculateAttendanceMetrics({ shift: matchedEmployee.shift, workingHours, checkInAt: capturedAt });
      location = verifiedLocation;
    } catch (checkInError) {
      setError(checkInError.message || "មិនអាចផ្ទៀងផ្ទាត់ GPS/ម៉ោងធ្វើការបានទេ");
      setChecking(false);
      return;
    }
    try {
      await setAttendanceToday((list) => {
        const existing = list.find((a) => a.id === matchedEmployee.id && a.dateISO === todayISO());
        const dateISO = todayISO();
        const record = {
          ...existing,
          id: matchedEmployee.id,
          recordId: `${matchedEmployee.id}_${dateISO}`,
          dateISO,
          date: formatKhmerDate(dateISO),
          name: matchedEmployee.name,
          role: matchedEmployee.role,
          branch: kioskBranch.name,
          branchId: kioskBranch.id,
          shift: metrics.shift,
          checkIn: time,
          checkInClientAt: capturedAt.toISOString(),
          checkInLocation: location,
          gpsStatus: location.gpsStatus,
          gpsVerified: location.gpsStatus === "recorded",
          checkOut: "—",
          ...metrics,
          source: "kiosk",
        };
        return existing ? list.map((a) => (a.id === matchedEmployee.id && a.dateISO === dateISO ? record : a)) : [record, ...list];
      });
      const record = {
        id: matchedEmployee.id, recordId: `${matchedEmployee.id}_${todayISO()}`, docId: `${matchedEmployee.id}_${todayISO()}`,
        dateISO: todayISO(), date: formatKhmerDate(todayISO()), name: matchedEmployee.name, role: matchedEmployee.role,
        branch: kioskBranch.name, branchId: kioskBranch.id, shift: metrics.shift, checkIn: time,
        checkInClientAt: capturedAt.toISOString(), checkInLocation: location, gpsStatus: location.gpsStatus,
        gpsVerified: location.gpsStatus === "recorded", checkOut: "—", ...metrics, source: "kiosk",
      };
      await setAttendanceHistory((list) => {
        const exists = list.some((item) => item.docId === record.docId);
        return exists ? list.map((item) => item.docId === record.docId ? record : item) : [record, ...list];
      });
      await notifyTelegram("check_in", record.recordId);
      setMessage({ type: "in", time, note: metrics.isLate ? `មកយឺត ${metrics.lateMinutes} នាទី` : "" });
      setTimeout(reset, 2500);
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុក Check-in បានទេ");
    } finally {
      setChecking(false);
    }
  };

  const handleCheckOut = async () => {
    setChecking(true); setError("");
    const capturedAt = new Date();
    const time = timeNow(capturedAt);
    let metrics;
    let location;
    try {
      const [workingHours, verifiedLocation] = await Promise.all([loadWorkingHours(), validateKioskLocation()]);
      location = verifiedLocation;
      metrics = calculateAttendanceMetrics({
        shift: todayRecord?.shift || matchedEmployee.shift,
        workingHours,
        checkInAt: todayRecord?.checkInClientAt || `${todayISO()}T${todayRecord?.checkIn || "08:00"}:00`,
        checkOutAt: capturedAt,
      });
    } catch (checkOutError) {
      setError(checkOutError.message || "មិនអាចផ្ទៀងផ្ទាត់ GPS/ម៉ោងធ្វើការបានទេ");
      setChecking(false);
      return;
    }
    try {
      await Promise.all([
        setAttendanceToday((list) =>
          list.map((a) => (a.id === matchedEmployee.id && a.dateISO === todayISO()
            ? { ...a, checkOut: time, checkOutClientAt: capturedAt.toISOString(), checkOutLocation: location, gpsStatus: location.gpsStatus, ...metrics } : a))
        ),
        setAttendanceHistory((list) => list.map((item) => item.docId === `${matchedEmployee.id}_${todayISO()}`
          ? { ...item, checkOut: time, checkOutClientAt: capturedAt.toISOString(), checkOutLocation: location, gpsStatus: location.gpsStatus, ...metrics }
          : item)),
      ]);
      await notifyTelegram("check_out", `${matchedEmployee.id}_${todayISO()}`);
      setMessage({ type: "out", time, note: metrics.isEarlyLeave ? `ចេញមុន ${metrics.earlyLeaveMinutes} នាទី` : "" });
      setTimeout(reset, 2500);
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុក Check-out បានទេ");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        fontFamily: "'Noto Sans Khmer','Inter',sans-serif",
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, #4A5FC1 55%, #6C7FE0 100%)`,
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative">
        <button onClick={onExit} className="absolute top-4 left-4 text-xs text-[#B4B7C6] hover:text-[#5B5F73]">
          ត្រឡប់ទៅចូលប្រព័ន្ធ
        </button>

        <div className="text-center mt-6 mb-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-xl mb-3"
            style={{ background: `linear-gradient(135deg, ${COLORS.primary}, #4A5FC1)` }}
          >
            <ScanLine size={24} />
          </div>
          <h1 className="text-lg font-bold text-[#1E2333]">ស្កេនវត្តមានបុគ្គលិក</h1>
          <p className="text-xs text-[#8A8FA3] mt-1">បញ្ចូលលេខកូដសម្ងាត់ ៤ខ្ទង់របស់អ្នក</p>
          <p className={`mt-2 flex items-center justify-center gap-1 text-xs ${kioskBranch ? "text-[#2A3F8F]" : "text-[#D9614F]"}`}>
            <MapPin size={13} /> {kioskBranch?.name || "Kiosk មិនទាន់ភ្ជាប់សាខា"}
          </p>
        </div>

        {!matchedEmployee ? (
          <>
            <div className="flex items-center justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    pin.length > i ? "bg-[#2A3F8F] border-[#2A3F8F]" : "border-[#EBEDF3]"
                  }`}
                />
              ))}
            </div>
            {error && (
              <div className="text-center text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2 mb-4">{error}</div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="h-14 rounded-2xl bg-[#F5F6FA] text-[#1E2333] text-xl font-semibold hover:bg-[#EEF1FB]"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setPin("")}
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#8A8FA3] text-sm font-medium hover:bg-[#EEF1FB]"
              >
                សម្អាត
              </button>
              <button
                onClick={() => pressDigit("0")}
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#1E2333] text-xl font-semibold hover:bg-[#EEF1FB]"
              >
                0
              </button>
              <button
                onClick={backspace}
                aria-label="លុបខ្ទង់ចុងក្រោយ"
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#8A8FA3] flex items-center justify-center hover:bg-[#EEF1FB]"
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : message ? (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
              style={{ background: message.type === "in" ? COLORS.greenLight : COLORS.amberLight }}
            >
              <CheckCircle2 size={32} color={message.type === "in" ? COLORS.green : COLORS.accent} />
            </div>
            <div className="font-bold text-[#1E2333]">{matchedEmployee.name}</div>
            <div className="text-sm text-[#8A8FA3] mt-1">
              {message.type === "in" ? `បានចូលធ្វើការម៉ោង ${message.time}` : `បានចេញពីការងារម៉ោង ${message.time}`}
            </div>
            {message.note && <div className="text-xs text-[#B97913] mt-1">{message.note}</div>}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#EEF1FB] text-[#2A3F8F] text-2xl font-bold flex items-center justify-center mx-auto mb-3">
              {matchedEmployee.name.slice(0, 1)}
            </div>
            <div className="font-bold text-[#1E2333]">{matchedEmployee.name}</div>
            <div className="text-xs text-[#8A8FA3] mb-6">
              {matchedEmployee.role} · {matchedEmployee.branch}
            </div>
            {error && <div className="mb-3 rounded-lg bg-[#FBEBE8] px-3 py-2 text-xs text-[#D9614F]">{error}</div>}

            {!todayRecord || todayRecord.checkIn === "—" ? (
              <button
                disabled={checking}
                onClick={handleCheckIn}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: COLORS.green }}
              >
                <LogIn size={16} /> {checking ? "កំពុងផ្ទៀងផ្ទាត់ GPS..." : "ចូលធ្វើការ"}
              </button>
            ) : !todayRecord.checkOut || todayRecord.checkOut === "—" ? (
              <button
                disabled={checking}
                onClick={handleCheckOut}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: COLORS.red }}
              >
                <LogOut size={16} /> {checking ? "កំពុងផ្ទៀងផ្ទាត់ GPS..." : "ចេញពីការងារ"}
              </button>
            ) : (
              <div className="text-sm text-[#8A8FA3] bg-[#F5F6FA] rounded-xl py-3.5">
                អ្នកបានបញ្ចប់វត្តមានថ្ងៃនេះរួចហើយ ({todayRecord.checkIn} – {todayRecord.checkOut})
              </div>
            )}
            <button onClick={reset} className="mt-3 text-xs text-[#B4B7C6] hover:text-[#5B5F73]">
              មិនមែនអ្នក?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
