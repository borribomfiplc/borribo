export const DEFAULT_SYSTEM_SETTINGS = {
  emailNotif: true,
  pushNotif: true,
  autoLock: true,
  autoBackup: true,
  darkMode: false,
  sessionTimeoutMinutes: 30,
  backupFreq: "daily",
  lastBackupAt: "",
  lastBackupCompletedAt: "",
  lastBackupStatus: "never",
  lastBackupError: "",
  lastBackupOperation: "",
};

export const DEFAULT_PUBLIC_SYSTEM_SETTINGS = {
  pushNotif: DEFAULT_SYSTEM_SETTINGS.pushNotif,
  autoLock: DEFAULT_SYSTEM_SETTINGS.autoLock,
  darkMode: DEFAULT_SYSTEM_SETTINGS.darkMode,
  sessionTimeoutMinutes: DEFAULT_SYSTEM_SETTINGS.sessionTimeoutMinutes,
};

export const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: "១៥ នាទី" },
  { value: 30, label: "៣០ នាទី" },
  { value: 60, label: "១ ម៉ោង" },
];

export const BACKUP_FREQUENCY_OPTIONS = [
  { value: "daily", label: "ប្រចាំថ្ងៃ" },
  { value: "weekly", label: "ប្រចាំសប្តាហ៍" },
  { value: "monthly", label: "ប្រចាំខែ" },
];

const LEGACY_TIMEOUTS = {
  "១៥ នាទី": 15,
  "៣០ នាទី": 30,
  "១ ម៉ោង": 60,
};

const LEGACY_BACKUP_FREQUENCIES = {
  "ប្រចាំថ្ងៃ": "daily",
  "ប្រចាំសប្តាហ៍": "weekly",
  "ប្រចាំខែ": "monthly",
};

export function normalizeSystemSettings(value = {}) {
  const rawTimeout = Number(value.sessionTimeoutMinutes);
  const sessionTimeoutMinutes = SESSION_TIMEOUT_OPTIONS.some((option) => option.value === rawTimeout)
    ? rawTimeout
    : LEGACY_TIMEOUTS[value.sessionTimeout] || DEFAULT_SYSTEM_SETTINGS.sessionTimeoutMinutes;

  const rawBackupFrequency = LEGACY_BACKUP_FREQUENCIES[value.backupFreq] || value.backupFreq;
  const backupFreq = BACKUP_FREQUENCY_OPTIONS.some((option) => option.value === rawBackupFrequency)
    ? rawBackupFrequency
    : DEFAULT_SYSTEM_SETTINGS.backupFreq;

  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...value,
    emailNotif: value.emailNotif !== false,
    pushNotif: value.pushNotif !== false,
    autoLock: value.autoLock !== false,
    autoBackup: value.autoBackup !== false,
    darkMode: value.darkMode === true,
    sessionTimeoutMinutes,
    backupFreq,
  };
}

export function publicSystemSettings(value = {}) {
  const settings = normalizeSystemSettings(value);
  return {
    pushNotif: settings.pushNotif,
    autoLock: settings.autoLock,
    darkMode: settings.darkMode,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
  };
}

export function sessionTimeoutMs(value = DEFAULT_SYSTEM_SETTINGS.sessionTimeoutMinutes) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : null;
}

export function timeoutLabel(value) {
  return SESSION_TIMEOUT_OPTIONS.find((option) => option.value === Number(value))?.label
    || SESSION_TIMEOUT_OPTIONS[1].label;
}

export function backupFrequencyLabel(value) {
  return BACKUP_FREQUENCY_OPTIONS.find((option) => option.value === value)?.label
    || BACKUP_FREQUENCY_OPTIONS[0].label;
}
