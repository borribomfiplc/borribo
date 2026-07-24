import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function attendanceRequest(path, body = {}) {
  if (!workerUrl) {
    throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ដើម្បីប្រើប្រព័ន្ធវត្តមានដែលមានសុវត្ថិភាព");
  }
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");

  const response = await fetch(`${workerUrl}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `Attendance Worker error (${response.status})`);
  }
  return result;
}

export function validateEmployeeQr(qrPayload) {
  return attendanceRequest("/api/attendance/employee/validate-qr", {
    qrPayload: String(qrPayload || ""),
  });
}

export function recordEmployeeAttendance(action, { location, qrPayload } = {}) {
  return attendanceRequest("/api/attendance/employee", {
    action,
    location: location || null,
    qrPayload: String(qrPayload || ""),
  });
}

export function lookupKioskEmployee(pin) {
  return attendanceRequest("/api/attendance/kiosk/lookup", { pin: String(pin || "") });
}

export function recordKioskAttendance(action, { pin, location } = {}) {
  return attendanceRequest("/api/attendance/kiosk", {
    action,
    pin: String(pin || ""),
    location: location || null,
  });
}


export function recordManualAttendance(record) {
  return attendanceRequest("/api/admin/attendance/mutate", { action: "attendance.manual-upsert", payload: { record } });
}

export function finalizeDailyAttendance(records) {
  return attendanceRequest("/api/admin/attendance/mutate", { action: "attendance.daily-close", payload: { records } });
}

export function importFingerprintAttendance(rows) {
  return attendanceRequest("/api/admin/attendance/mutate", { action: "attendance.fingerprint-import", payload: { rows } });
}

export function createAttendanceCorrection(correction) {
  return attendanceRequest("/api/admin/attendance/mutate", { action: "correction.create", payload: { correction } });
}

export function decideAttendanceCorrection(correctionId, decision, reason = "") {
  return attendanceRequest("/api/admin/attendance/mutate", { action: "correction.decide", payload: { correctionId, decision, reason } });
}
