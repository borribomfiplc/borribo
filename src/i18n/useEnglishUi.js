import { useEffect } from "react";

// The app keeps Khmer values internally (for Firestore compatibility), while
// this layer translates what is displayed when English is selected.  Keeping
// IDs and status values unchanged prevents language changes from breaking
// filters, reports, or existing records.
const ENGLISH = {
  "ផ្ទាំងគ្រប់គ្រង": "Dashboard", "បុគ្គលិក": "Employees", "វត្តមាន": "Attendance",
  "ច្បាប់ឈប់សម្រាក": "Leave", "អង្គភាព": "Organization", "ប្រតិទិន": "Calendar",
  "ប្រតិបត្តិការ MFI": "MFI Operations", "របាយការណ៍": "Reports", "ការកំណត់": "Settings",
  "ការភ្ជាប់ប្រព័ន្ធ": "Integrations", "បញ្ជីបុគ្គលិក": "Employee List", "បន្ថែមបុគ្គលិក": "Add Employee",
  "វត្តមានប្រចាំថ្ងៃ": "Daily Attendance", "ប្រវត្តិវត្តមាន": "Attendance History", "កែតម្រូវវត្តមាន": "Attendance Correction",
  "សំណើសុំច្បាប់": "Leave Request", "អនុម័តច្បាប់": "Leave Approval", "សមតុល្យច្បាប់": "Leave Balance",
  "សាខា": "Branches", "នាយកដ្ឋាន": "Departments", "តួនាទីការងារ": "Job Roles",
  "គ្រប់គ្រងទ្រព្យសម្បត្តិ": "Asset Management", "កម្ចីបុគ្គលិក": "Staff Loans",
  "របាយការណ៍វត្តមាន": "Attendance Report", "របាយការណ៍ច្បាប់": "Leave Report", "របាយការណ៍ប្រចាំខែ": "Monthly Report",
  "ក្រុមហ៊ុន": "Company", "អ្នកប្រើប្រាស់ និងតួនាទី": "Users & Roles", "ម៉ោងធ្វើការ": "Working Hours",
  "ថ្ងៃឈប់សម្រាក": "Holidays", "GPS និង QR": "GPS & QR", "ប្រព័ន្ធ": "System",
  "Fingerprint ម៉ាស៊ីន": "Fingerprint Device", "Telegram Bot": "Telegram Bot",
  "ផ្សេងទៀត": "More", "ទំព័រដើម": "Home", "ច្បាប់ឈប់": "Leave",
  "ស្វែងរកបុគ្គលិក...": "Search employees...", "រកមិនឃើញបុគ្គលិកទេ": "No employees found",
  "កំពុងផ្ទុក...": "Loading...", "ការជូនដំណឹងថ្មី": "Notifications", "សម្គាល់ថាបានអានទាំងអស់": "Mark all as read",
  "មិនមានការជូនដំណឹងថ្មីទេ": "No new notifications", "ចាកចេញ": "Log out",
  "គ្រប់សាខា": "All branches", "អ្នកគ្រប់គ្រងប្រព័ន្ធ": "System Administrator",
  "អ្នកគ្រប់គ្រងធនធានមនុស្ស": "HR Manager", "Kiosk វត្តមាន": "Attendance Kiosk",
  "មានវត្តមាន": "Present", "យឺត": "Late", "អវត្តមាន": "Absent", "ច្បាប់": "On leave",
  "រង់ចាំពិនិត្យ": "Pending review", "បានអនុម័ត": "Approved", "បានបដិសេធ": "Rejected",
  "រក្សាទុក": "Save", "បោះបង់": "Cancel", "លុប": "Delete", "កែប្រែ": "Edit", "បិទ": "Close",
  "ថ្ងៃនេះ": "Today", "សរុប": "Total", "មើលទាំងអស់": "View all", "មើលលម្អិត": "View details",
};

const textOriginal = new WeakMap();
const attributeOriginal = new WeakMap();
const ATTRIBUTES = ["placeholder", "aria-label", "title"];

function translate(value, language) {
  return language === "English" ? (ENGLISH[value] || value) : value;
}

function updateElement(element, language) {
  if (element.nodeType === Node.TEXT_NODE) {
    if (!textOriginal.has(element)) textOriginal.set(element, element.nodeValue);
    const translated = translate(textOriginal.get(element), language);
    if (element.nodeValue !== translated) element.nodeValue = translated;
    return;
  }
  if (element.nodeType !== Node.ELEMENT_NODE || element.dataset.noI18n !== undefined) return;
  const originals = attributeOriginal.get(element) || {};
  ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
    element.setAttribute(attribute, translate(originals[attribute], language));
  });
  attributeOriginal.set(element, originals);
}

function translateTree(root, language) {
  if (!root) return;
  updateElement(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    updateElement(current, language);
    current = walker.nextNode();
  }
}

export function useEnglishUi(language) {
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    document.documentElement.lang = language === "English" ? "en" : "km";
    translateTree(root, language);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") updateElement(mutation.target, language);
        mutation.addedNodes.forEach((node) => translateTree(node, language));
      });
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
}
