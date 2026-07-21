import React, { useState } from "react";
import {
  ScanLine, LogIn, LogOut, X, CheckCircle2
} from "lucide-react";
import { COLORS } from "../data/theme";
import { attendanceHistoryRecord, formatKhmerDate, timeNow, todayISO } from "../utils/attendance";

export default function KioskCheckInPage({ employees, attendanceToday, setAttendanceToday, attendanceHistory, setAttendanceHistory, onExit }) {
  const [pin, setPin] = useState("");
  const [matchedEmployee, setMatchedEmployee] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null); // { type: "in" | "out", time }

  const todayRecord = matchedEmployee ? attendanceToday.find((a) => a.id === matchedEmployee.id && a.dateISO === todayISO()) : null;

  const reset = () => {
    setPin("");
    setMatchedEmployee(null);
    setError("");
    setMessage(null);
  };

  const pressDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      const emp = employees.find((e) => e.pin === next);
      if (emp) {
        setMatchedEmployee(emp);
      } else {
        setError("លេខកូដសម្ងាត់មិនត្រឹមត្រូវ សូមព្យាយាមម្តងទៀត");
        setTimeout(() => setPin(""), 700);
      }
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  const handleCheckIn = () => {
    const time = timeNow();
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const isLate = h > 8 || (h === 8 && m > 15);
    setAttendanceToday((list) => {
      const existing = list.find((a) => a.id === matchedEmployee.id);
      const dateISO = todayISO();
      const record = {
        ...existing,
        id: matchedEmployee.id,
        recordId: `${matchedEmployee.id}_${dateISO}`,
        dateISO,
        date: formatKhmerDate(dateISO),
        name: matchedEmployee.name,
        role: matchedEmployee.role,
        branch: matchedEmployee.branch,
        shift: "ព្រឹក",
        checkIn: time,
        checkOut: "—",
        hours: "កំពុងធ្វើការ",
        status: isLate ? "យឺត" : "មានវត្តមាន",
      };
      return existing ? list.map((a) => (a.id === matchedEmployee.id ? record : a)) : [record, ...list];
    });
    const record = {
      id: matchedEmployee.id, recordId: `${matchedEmployee.id}_${todayISO()}`, docId: `${matchedEmployee.id}_${todayISO()}`,
      dateISO: todayISO(), date: formatKhmerDate(todayISO()), name: matchedEmployee.name, role: matchedEmployee.role,
      branch: matchedEmployee.branch, shift: "ព្រឹក", checkIn: time, checkOut: "—", hours: "កំពុងធ្វើការ",
      status: isLate ? "យឺត" : "មានវត្តមាន", source: "kiosk",
    };
    setAttendanceHistory((list) => {
      const exists = list.some((item) => item.docId === record.docId);
      return exists ? list.map((item) => item.docId === record.docId ? record : item) : [record, ...list];
    });
    setMessage({ type: "in", time });
    setTimeout(reset, 2500);
  };

  const handleCheckOut = () => {
    const time = timeNow();
    setAttendanceToday((list) =>
      list.map((a) => (a.id === matchedEmployee.id ? { ...a, checkOut: time, hours: "បញ្ចប់ការងារ" } : a))
    );
    setAttendanceHistory((list) => list.map((item) => item.docId === `${matchedEmployee.id}_${todayISO()}`
      ? { ...item, checkOut: time, hours: "បញ្ចប់ការងារ" }
      : item));
    setMessage({ type: "out", time });
    setTimeout(reset, 2500);
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

            {!todayRecord || todayRecord.checkIn === "—" ? (
              <button
                onClick={handleCheckIn}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
                style={{ background: COLORS.green }}
              >
                <LogIn size={16} /> ចូលធ្វើការ
              </button>
            ) : !todayRecord.checkOut || todayRecord.checkOut === "—" ? (
              <button
                onClick={handleCheckOut}
                className="w-full text-white text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
                style={{ background: COLORS.red }}
              >
                <LogOut size={16} /> ចេញពីការងារ
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
