const STATUS_ALIASES = new Map([
  ["សកម្ម", "សកម្ម"],
  ["ឈប់សម្រាក", "ឈប់សម្រាក"],
  ["អសកម្ម", "អសកម្ម"],
  // Values written by the short-lived v49 Worker encoding bug.
  ["ážŸáž€áž˜áŸ’áž˜", "សកម្ម"],
  ["ážˆáž”áŸ‹ážŸáž˜áŸ’ážšáž¶áž€", "ឈប់សម្រាក"],
  ["áž¢ážŸáž€áž˜áŸ’áž˜", "អសកម្ម"],
]);

export function normalizeEmployeeStatus(value, fallback = "អសកម្ម") {
  const status = String(value || "").trim();
  return STATUS_ALIASES.get(status) || fallback;
}

export function isEmployeeInactive(value) {
  return normalizeEmployeeStatus(value) === "អសកម្ម";
}
