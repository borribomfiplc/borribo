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
