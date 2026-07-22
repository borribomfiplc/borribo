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
  schedules: {
    weekday: { start: "08:00", end: "17:00", grace: "15" },
    saturday: { start: "08:00", end: "12:00", grace: "15" },
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
  schedules: {
    // `shifts.morning` keeps previously saved settings compatible while the
    // organisation moves from a shift model to a day-based work schedule.
    weekday: {
      ...DEFAULT_WORKING_HOURS.schedules.weekday,
      ...(workingHours.shifts?.morning || {}),
      ...(workingHours.schedules?.weekday || {}),
    },
    saturday: {
      ...DEFAULT_WORKING_HOURS.schedules.saturday,
      ...(workingHours.schedules?.saturday || {}),
    },
  },
  workDays: Array.isArray(workingHours.workDays) ? workingHours.workDays : DEFAULT_WORKING_HOURS.workDays,
});

const scheduleDetailsForDate = (date, workingHours) => {
  const scheduleSettings = safeWorkingHours(workingHours);
  const englishWeekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Phnom_Penh", weekday: "long" }).format(new Date(date));
  const workDay = weekdayNames[englishWeekday];
  const scheduleKey = englishWeekday === "Saturday" ? "saturday" : "weekday";
  return {
    scheduleSettings,
    schedule: scheduleSettings.schedules[scheduleKey],
    scheduleKey,
    workDay,
  };
};

export const scheduleTextForRecord = (record = {}) => {
  if (record.scheduledStart && record.scheduledEnd) return `${record.scheduledStart}–${record.scheduledEnd}`;
  const referenceDate = record.dateISO ? `${record.dateISO}T12:00:00+07:00` : new Date();
  const { schedule } = scheduleDetailsForDate(referenceDate, DEFAULT_WORKING_HOURS);
  return `${schedule.start}–${schedule.end}`;
};

export const calculateAttendanceMetrics = ({ workingHours, checkInAt, checkOutAt }) => {
  const referenceDate = checkInAt || checkOutAt || new Date();
  const { scheduleSettings, schedule, scheduleKey, workDay } = scheduleDetailsForDate(referenceDate, workingHours);
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
    // Keep `shift` on new records for compatibility with existing reports and
    // Firestore documents. It now describes the organisation-wide schedule.
    shift: scheduleKey === "saturday" ? "កន្លះថ្ងៃ" : "ពេញម៉ោង",
    scheduleType: scheduleKey,
    scheduleLabel: scheduleKey === "saturday" ? "សៅរ៍ កន្លះថ្ងៃ" : "ចន្ទ–សុក្រ ពេញមួយថ្ងៃ",
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
