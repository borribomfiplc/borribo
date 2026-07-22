import { leaveQuotas } from "../data/mockData";

export const LEAVE_PORTIONS = ["ពេញថ្ងៃ", "ពេលព្រឹក", "ពេលរសៀល"];

const validDateISO = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const holidayDateSet = (holidays = []) => new Set(
  holidays.map((holiday) => holiday.dateISO || holiday.date).filter(validDateISO),
);

export function enumerateLeaveDates(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

export function isWorkingDate(dateISO, holidays = []) {
  if (!validDateISO(dateISO)) return false;
  const day = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  return day !== 0 && !holidayDateSet(holidays).has(dateISO);
}

export function workingLeaveDates(startDate, endDate, holidays = []) {
  return enumerateLeaveDates(startDate, endDate).filter((dateISO) => isWorkingDate(dateISO, holidays));
}

export function calculateLeaveDays(startDate, endDate, portion = "ពេញថ្ងៃ", holidays = []) {
  const dates = workingLeaveDates(startDate, endDate, holidays);
  if (!dates.length) return 0;
  return dates.length === 1 && portion !== "ពេញថ្ងៃ" ? 0.5 : dates.length;
}

export function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  if (![firstStart, firstEnd, secondStart, secondEnd].every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value || ""))) return false;
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

export function leaveRequestsConflict(first, second) {
  if (!rangesOverlap(first.startDate, first.endDate, second.startDate, second.endDate)) return false;
  const firstHalf = first.startDate === first.endDate && first.portion && first.portion !== "ពេញថ្ងៃ";
  const secondHalf = second.startDate === second.endDate && second.portion && second.portion !== "ពេញថ្ងៃ";
  return !(firstHalf && secondHalf && first.startDate === second.startDate && first.portion !== second.portion);
}

export function requestLeaveDaysForYear(request, year, holidays = []) {
  const dates = workingLeaveDates(request.startDate, request.endDate, holidays)
    .filter((dateISO) => !year || dateISO.startsWith(`${year}-`));
  if (!dates.length) return 0;
  return dates.length === 1 && request.startDate === request.endDate && request.portion && request.portion !== "ពេញថ្ងៃ"
    ? 0.5 : dates.length;
}

export function usedLeaveDays(requests, employeeId, leaveType, options = {}) {
  const { year = "", holidays = [], excludedId = "" } = options;
  return requests
    .filter((request) =>
      request.id !== excludedId &&
      (request.employeeId === employeeId || request.empId === employeeId) &&
      request.leaveType === leaveType &&
      request.status === "បានអនុម័ត")
    .reduce((total, request) => total + requestLeaveDaysForYear(request, year, holidays), 0);
}

export function remainingLeaveDays(requests, employeeId, leaveType, options = {}) {
  const quota = leaveQuotas[leaveType];
  if (quota == null) return null;
  return Math.max(0, quota - usedLeaveDays(requests, employeeId, leaveType, options));
}

export function approvedLeaveOnDate(requests, employeeId, dateISO, holidays = []) {
  if (!isWorkingDate(dateISO, holidays)) return undefined;
  return requests.find((request) =>
    request.status === "បានអនុម័ត" &&
    (request.employeeId === employeeId || request.empId === employeeId) &&
    /^\d{4}-\d{2}-\d{2}$/.test(request.startDate || "") &&
    request.startDate <= dateISO && request.endDate >= dateISO);
}

export function leaveAttendanceRecord(request, employee, dateISO, actor = {}) {
  const employeeId = request.employeeId || request.empId || employee?.id;
  const portion = request.portion || "ពេញថ្ងៃ";
  const isHalfDay = portion !== "ពេញថ្ងៃ";
  return {
    id: employeeId,
    docId: `${employeeId}_${dateISO}`,
    recordId: `${employeeId}_${dateISO}`,
    uid: request.employeeUid || employee?.uid || "",
    name: request.name || employee?.name || "",
    role: request.role || employee?.role || "បុគ្គលិក",
    branch: request.branch || employee?.branch || "",
    shift: employee?.shift || "ព្រឹក",
    dateISO,
    date: dateISO,
    ...(!isHalfDay ? { checkIn: "—", checkOut: "—", hours: "—", status: "ច្បាប់" } : {}),
    ...(!isHalfDay ? { source: "leave" } : { leaveSource: "leave" }),
    leaveRequestId: request.id,
    leaveType: request.leaveType,
    leavePortion: portion,
    leaveUnits: isHalfDay ? 0.5 : 1,
    leaveStatus: isHalfDay ? "ច្បាប់កន្លះថ្ងៃ" : "ច្បាប់",
    updatedBy: actor.uid || "",
    updatedByName: actor.name || "",
  };
}
