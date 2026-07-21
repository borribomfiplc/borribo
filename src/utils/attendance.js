export const cambodiaParts = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
);

export const todayISO = (date = new Date()) => {
  const { year, month, day } = cambodiaParts(date);
  return `${year}-${month}-${day}`;
};

export const formatKhmerDate = (dateISO) => {
  if (!dateISO) return "—";
  return new Intl.DateTimeFormat("km-KH", { timeZone: "Asia/Phnom_Penh", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${dateISO}T12:00:00`));
};

export const timeNow = (date = new Date()) => new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Phnom_Penh", hour: "2-digit", minute: "2-digit", hour12: true,
}).format(date);

export const time24Now = (date = new Date()) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Phnom_Penh", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
}).format(date);

// Keep the default in one place so every attendance source (phone, kiosk and
// manual entry) applies the exact same schedule when a setting has not been
// saved yet.
export const DEFAULT_WORKING_HOURS = {
  shifts: {
    morning: { start: "08:00", end: "17:00", grace: "15" },
    evening: { start: "13:00", end: "21:00", grace: "15" },
  },
  workDays: ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"],
};

const weekdayNames = {
  Monday: "ច័ន្ទ", Tuesday: "អង្គារ", Wednesday: "ពុធ", Thursday: "ព្រហ",
  Friday: "សុក្រ", Saturday: "សៅរ៍", Sunday: "អាទិត្យ",
};

const minutesFromTime = (value) => {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

const safeWorkingHours = (workingHours = {}) => ({
  shifts: {
    morning: { ...DEFAULT_WORKING_HOURS.shifts.morning, ...(workingHours.shifts?.morning || {}) },
    evening: { ...DEFAULT_WORKING_HOURS.shifts.evening, ...(workingHours.shifts?.evening || {}) },
  },
  workDays: Array.isArray(workingHours.workDays) ? workingHours.workDays : DEFAULT_WORKING_HOURS.workDays,
});

export const calculateAttendanceMetrics = ({ shift = "ព្រឹក", workingHours, checkInAt, checkOutAt }) => {
  const scheduleSettings = safeWorkingHours(workingHours);
  const referenceTime = minutesFromTime(time24Now(new Date(checkInAt || checkOutAt || new Date())));
  // For rotating staff, choose the scheduled start closest to the first scan,
  // then persist that resolved shift on the attendance record for check-out.
  const shiftKey = shift === "ល្ងាច" ? "evening" : shift === "ប្តូរវេន"
    && Math.abs(referenceTime - minutesFromTime(scheduleSettings.shifts.evening.start)) < Math.abs(referenceTime - minutesFromTime(scheduleSettings.shifts.morning.start))
      ? "evening" : "morning";
  const schedule = scheduleSettings.shifts[shiftKey];
  const referenceDate = checkInAt || checkOutAt || new Date();
  const englishWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Phnom_Penh", weekday: "long" }).format(new Date(referenceDate));
  const workDay = weekdayNames[englishWeekday];
  const isWorkingDay = scheduleSettings.workDays.includes(workDay);
  const checkInMinutes = checkInAt ? minutesFromTime(time24Now(new Date(checkInAt))) : null;
  const checkOutMinutes = checkOutAt ? minutesFromTime(time24Now(new Date(checkOutAt))) : null;
  const startMinutes = minutesFromTime(schedule.start);
  const endMinutes = minutesFromTime(schedule.end);
  const graceMinutes = Math.max(0, Number.parseInt(schedule.grace, 10) || 0);
  const lateMinutes = isWorkingDay && checkInMinutes !== null && startMinutes !== null
    ? Math.max(0, checkInMinutes - startMinutes - graceMinutes) : 0;
  const earlyLeaveMinutes = isWorkingDay && checkOutMinutes !== null && endMinutes !== null
    ? Math.max(0, endMinutes - checkOutMinutes) : 0;

  return {
    shift: shiftKey === "evening" ? "ល្ងាច" : "ព្រឹក",
    scheduledStart: schedule.start,
    scheduledEnd: schedule.end,
    graceMinutes,
    workDay,
    isWorkingDay,
    lateMinutes,
    earlyLeaveMinutes,
    isLate: lateMinutes > 0,
    isEarlyLeave: earlyLeaveMinutes > 0,
    status: lateMinutes > 0 ? "យឺត" : "មានវត្តមាន",
    hours: checkInAt && checkOutAt ? workingDuration(checkInAt, checkOutAt) : "កំពុងធ្វើការ",
  };
};

export const workingDuration = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return "កំពុងធ្វើការ";
  const minutes = Math.max(0, Math.floor((new Date(endedAt) - new Date(startedAt)) / 60000));
  return `${Math.floor(minutes / 60)} ម៉ោង ${minutes % 60} នាទី`;
};

export const attendanceHistoryRecord = (record) => ({
  ...record,
  docId: record.recordId,
  date: formatKhmerDate(record.dateISO),
});

export const distanceInMeters = (from, to) => {
  if (!from || !to || !Number.isFinite(Number(from.latitude)) || !Number.isFinite(Number(to.latitude))) return null;
  const earthRadius = 6371000;
  const lat1 = Number(from.latitude) * Math.PI / 180;
  const lat2 = Number(to.latitude) * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (Number(to.longitude) - Number(from.longitude)) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
