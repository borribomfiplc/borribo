import { isEmployeeInactive } from "./employeeStatus.js";

export const ACCOUNT_STATUS = {
  NONE: "none",
  ACTIVE: "active",
  DISABLED: "disabled",
  DELETED: "deleted",
};

export const ACCOUNT_STATUS_META = {
  [ACCOUNT_STATUS.NONE]: {
    label: "មិនទាន់មានគណនី",
    description: "មិនទាន់បានបង្កើត Login Account",
    bg: "#F1F2F6",
    fg: "#73778A",
  },
  [ACCOUNT_STATUS.ACTIVE]: {
    label: "សកម្ម",
    description: "អាច Login និង Check-in បាន",
    bg: "#E9F7EF",
    fg: "#257C4B",
  },
  [ACCOUNT_STATUS.DISABLED]: {
    label: "បានបិទ",
    description: "មិនអាច Login ឬ Check-in បាន",
    bg: "#FFF4DD",
    fg: "#9A6815",
  },
  [ACCOUNT_STATUS.DELETED]: {
    label: "បានលុបគណនី Login",
    description: "Login ត្រូវបានលុប ប៉ុន្តែប្រវត្តិការងារនៅដដែល",
    bg: "#FBEBE8",
    fg: "#B84637",
  },
};

export function getEmployeeAccountStatus(employee = {}) {
  const safeEmployee = employee && typeof employee === "object" ? employee : {};
  const stored = String(safeEmployee.accountStatus || "").trim().toLowerCase();
  if (Object.values(ACCOUNT_STATUS).includes(stored)) return stored;
  if (safeEmployee.uid) return isEmployeeInactive(safeEmployee.status) ? ACCOUNT_STATUS.DISABLED : ACCOUNT_STATUS.ACTIVE;
  if (safeEmployee.loginDeletedAt) return ACCOUNT_STATUS.DELETED;
  return ACCOUNT_STATUS.NONE;
}

export function getEmployeeAccountMeta(employee = {}) {
  return ACCOUNT_STATUS_META[getEmployeeAccountStatus(employee)] || ACCOUNT_STATUS_META[ACCOUNT_STATUS.NONE];
}
