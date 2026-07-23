export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  EMPLOYEE: "employee",
  KIOSK: "kiosk",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "អ្នកគ្រប់គ្រងប្រព័ន្ធ",
  [ROLES.HR]: "អ្នកគ្រប់គ្រងធនធានមនុស្ស",
  [ROLES.EMPLOYEE]: "បុគ្គលិក",
  [ROLES.KIOSK]: "Kiosk វត្តមាន",
};

export function isManager(role) {
  return role === ROLES.ADMIN || role === ROLES.HR;
}

export function allowedNavSections(role) {
  if (role === ROLES.ADMIN) return null; // null means every section is allowed
  if (role === ROLES.HR) {
    return new Set([
      "dashboard", "employees", "attendance", "leave", "org", "calendar", "mfiOperations", "reports", "settings", "integrations",
    ]);
  }
  return new Set(["dashboard"]);
}

export function allowedNavItems(role) {
  if (role === ROLES.ADMIN) return null;
  if (role === ROLES.HR) {
    return new Set([
      "បញ្ជីបុគ្គលិក", "បន្ថែមបុគ្គលិក", "វត្តមានប្រចាំថ្ងៃ", "ប្រវត្តិវត្តមាន",
      "កែតម្រូវវត្តមាន", "សំណើសុំច្បាប់", "អនុម័តច្បាប់", "សមតុល្យច្បាប់",
      "រចនាសម្ព័ន្ធអង្គភាព", "សាខា", "នាយកដ្ឋាន", "តួនាទីការងារ", "របាយការណ៍វត្តមាន", "របាយការណ៍ច្បាប់",
      "របាយការណ៍ប្រចាំខែ", "ម៉ោងធ្វើការ", "ថ្ងៃឈប់សម្រាក", "GPS និង QR",
      "KPI Dashboard", "គ្រប់គ្រងទ្រព្យសម្បត្តិ", "កម្ចីបុគ្គលិក", "ប្រាក់ខែ", "Fingerprint ម៉ាស៊ីន", "Telegram Bot",
    ]);
  }
  return new Set();
}

export function filterNavigation(sections, role) {
  const sectionsAllowed = allowedNavSections(role);
  const itemsAllowed = allowedNavItems(role);
  return sections
    .filter((section) => !sectionsAllowed || sectionsAllowed.has(section.key))
    .map((section) => {
      if (section.single || !itemsAllowed) return section;
      return { ...section, items: section.items.filter((item) => itemsAllowed.has(item)) };
    })
    .filter((section) => section.single || section.items.length > 0);
}
