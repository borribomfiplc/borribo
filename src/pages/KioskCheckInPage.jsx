import React, { useState } from "react";
import { ScanLine, LogIn, LogOut, X, CheckCircle2, MapPin } from "lucide-react";
import { COLORS } from "../data/theme";
import { lookupKioskEmployee, recordKioskAttendance } from "../services/attendance";

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
      (locationError) => resolve({
        gpsStatus: locationError.code === 1 ? "permission-denied" : "not-available",
      }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export default function KioskCheckInPage({ branches = [], profile, onExit }) {
  const [pin, setPin] = useState("");
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [verifiedBranch, setVerifiedBranch] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [checking, setChecking] = useState(false);

  const configuredBranch = branches.find((branch) => (
    (profile?.branchId && branch.id === profile.branchId) || branch.name === profile?.branch
  ));
  const branchName = verifiedBranch?.name || configuredBranch?.name || profile?.branch || "Kiosk មិនទាន់ភ្ជាប់សាខា";

  const reset = () => {
    setPin("");
    setMatchedEmployee(null);
    setTodayRecord(null);
    setVerifiedBranch(null);
    setError("");
    setMessage(null);
    setChecking(false);
  };

  const verifyPin = async (nextPin) => {
    setChecking(true);
    try {
      const result = await lookupKioskEmployee(nextPin);
      setMatchedEmployee(result.employee);
      setTodayRecord(result.attendance || null);
      setVerifiedBranch(result.branch || null);
    } catch (lookupError) {
      setError(lookupError.message || "លេខកូដមិនត្រឹមត្រូវ");
      window.setTimeout(() => setPin(""), 700);
    } finally {
      setChecking(false);
    }
  };

  const pressDigit = (digit) => {
    if (checking || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError("");
    if (next.length === 4) void verifyPin(next);
  };

  const backspace = () => {
    if (!checking) setPin((value) => value.slice(0, -1));
  };

  const recordAttendance = async (action) => {
    if (!matchedEmployee || checking) return;
    setChecking(true);
    setError("");
    try {
      const location = await readLocation();
      const result = await recordKioskAttendance(action, { pin, location });
      setMatchedEmployee(result.employee || matchedEmployee);
      setTodayRecord(result.record);
      setMessage({
        type: action === "in" ? "in" : "out",
        time: action === "in" ? result.record.checkIn : result.record.checkOut,
        note: action === "in" && result.record.isLate
          ? `មកយឺត ${result.record.lateMinutes} នាទី`
          : action === "out" && result.record.isEarlyLeave
            ? `ចេញមុន ${result.record.earlyLeaveMinutes} នាទី`
            : "",
      });
      window.setTimeout(reset, 2500);
    } catch (saveError) {
      setError(saveError.message || "មិនអាចរក្សាទុកវត្តមានបានទេ");
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
          <p className={`mt-2 flex items-center justify-center gap-1 text-xs ${profile?.branch ? "text-[#2A3F8F]" : "text-[#D9614F]"}`}>
            <MapPin size={13} /> {branchName}
          </p>
        </div>

        {!matchedEmployee ? (
          <>
            <div className="flex items-center justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 ${
                    pin.length > index ? "bg-[#2A3F8F] border-[#2A3F8F]" : "border-[#EBEDF3]"
                  }`}
                />
              ))}
            </div>
            {checking && <div className="text-center text-xs text-[#2A3F8F] mb-4">កំពុងផ្ទៀងផ្ទាត់នៅ Server...</div>}
            {error && <div className="text-center text-xs text-[#D9614F] bg-[#FBEBE8] rounded-lg px-3 py-2 mb-4">{error}</div>}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  disabled={checking}
                  onClick={() => pressDigit(digit)}
                  className="h-14 rounded-2xl bg-[#F5F6FA] text-[#1E2333] text-xl font-semibold hover:bg-[#EEF1FB] disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                disabled={checking}
                onClick={() => setPin("")}
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#8A8FA3] text-sm font-medium hover:bg-[#EEF1FB] disabled:opacity-50"
              >
                សម្អាត
              </button>
              <button
                disabled={checking}
                onClick={() => pressDigit("0")}
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#1E2333] text-xl font-semibold hover:bg-[#EEF1FB] disabled:opacity-50"
              >
                0
              </button>
              <button
                disabled={checking}
                onClick={backspace}
                aria-label="លុបខ្ទង់ចុងក្រោយ"
                className="h-14 rounded-2xl bg-[#F5F6FA] text-[#8A8FA3] flex items-center justify-center hover:bg-[#EEF1FB] disabled:opacity-50"
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
            <div className="text-xs text-[#8A8FA3] mb-6">{matchedEmployee.role} · {verifiedBranch?.name || matchedEmployee.branch}</div>
            {error && <div className="mb-3 rounded-lg bg-[#FBEBE8] px-3 py-2 text-xs text-[#D9614F]">{error}</div>}

            {!todayRecord?.checkIn || todayRecord.checkIn === "—" ? (
              <button
                disabled={checking}
                onClick={() => recordAttendance("in")}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: COLORS.green }}
              >
                <LogIn size={16} /> {checking ? "កំពុងផ្ទៀងផ្ទាត់នៅ Server..." : "ចូលធ្វើការ"}
              </button>
            ) : !todayRecord.checkOut || todayRecord.checkOut === "—" ? (
              <button
                disabled={checking}
                onClick={() => recordAttendance("out")}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: COLORS.red }}
              >
                <LogOut size={16} /> {checking ? "កំពុងផ្ទៀងផ្ទាត់នៅ Server..." : "ចេញពីការងារ"}
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
