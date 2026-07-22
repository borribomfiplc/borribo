import { leaveQuotas } from "../data/mockData";

export const LEAVE_PORTIONS = ["ពេញថ្ងៃ", "ពេលព្រឹក", "ពេលរសៀល"];

export function enumerateLeaveDates(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

export function calculateLeaveDays(startDate, endDate, portion = "ពេញថ្ងៃ") {
  const dates = enumerateLeaveDates(startDate, endDate);
  if (!dates.length) return 0;
  return dates.length === 1 && portion !== "ពេញថ្ងៃ" ? 0.5 : dates.length;
}

export function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  if (![firstStart, firstEnd, secondStart, secondEnd].every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value || ""))) return false;
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

export function usedLeaveDays(requests, employeeId, leaveType, excludedId = "") {
  return requests
    .filter((request) =>
      request.id !== excludedId &&
      (request.employeeId === employeeId || request.empId === employeeId) &&
      request.leaveType === leaveType &&
      request.status === "បានអនុម័ត")
    .reduce((total, request) => total + Number(request.days || 0), 0);
}

export function remainingLeaveDays(requests, employeeId, leaveType, excludedId = "") {
  const quota = leaveQuotas[leaveType];
  if (quota == null) return null;
  return Math.max(0, quota - usedLeaveDays(requests, employeeId, leaveType, excludedId));
}

export function approvedLeaveOnDate(requests, employeeId, dateISO) {
  return requests.find((request) =>
    request.status === "បានអនុម័ត" &&
    (request.employeeId === employeeId || request.empId === employeeId) &&
    /^\d{4}-\d{2}-\d{2}$/.test(request.startDate || "") &&
    request.startDate <= dateISO && request.endDate >= dateISO);
}

export function leaveAttendanceRecord(request, employee, dateISO, actor = {}) {
  const employeeId = request.employeeId || request.empId || employee?.id;
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
    checkIn: "—",
    checkOut: "—",
    hours: "—",
    status: "ច្បាប់",
    source: "leave",
    leaveRequestId: request.id,
    leaveType: request.leaveType,
    leavePortion: request.portion || "ពេញថ្ងៃ",
    updatedBy: actor.uid || "",
    updatedByName: actor.name || "",
  };
}

