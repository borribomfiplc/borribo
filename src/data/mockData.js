// Seed/demo data — used to populate a brand-new Firebase project once
// (see scripts/seed.mjs) and as local fallbacks. Once Firestore has data,
// the app reads live from the database, not from this file.
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
// Node.js runs this module for `npm run seed`; unlike Vite it requires the
// explicit extension for local ES module imports.
import { COLORS } from "./theme.js";

export const weekData = [
  { day: "ច័ន្ទ", present: 118, late: 10, absent: 8, leave: 4 },
  { day: "អង្គារ", present: 122, late: 12, absent: 9, leave: 5 },
  { day: "ពុធ", present: 128, late: 16, absent: 12, leave: 8 },
  { day: "ព្រហ", present: 121, late: 9, absent: 7, leave: 6 },
  { day: "សុក្រ", present: 125, late: 14, absent: 10, leave: 3 },
  { day: "សៅរ៍", present: 90, late: 5, absent: 4, leave: 2 },
  { day: "អាទិត្យ", present: 40, late: 2, absent: 1, leave: 1 },
];

export const leaveData = [
  { name: "ច្បាប់ប្រចាំឆ្នាំ", value: 12, color: COLORS.primary },
  { name: "ច្បាប់ឈឺ", value: 6, color: COLORS.green },
  { name: "ច្បាប់ផ្ទាល់ខ្លួន", value: 5, color: COLORS.accent },
  { name: "ច្បាប់ផ្សេងៗ", value: 5, color: COLORS.purple },
];

export const checkins = [
  { name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", time: "08:05 AM" },
  { name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", time: "08:12 AM" },
  { name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", time: "08:19 AM" },
  { name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", time: "08:25 AM" },
  { name: "អេក សុគន្ធ", role: "ធនធានមនុស្ស", time: "08:31 AM" },
];

export const birthdays = [
  { name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ" },
  { name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា" },
  { name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ" },
];

export const initialEmployees = [
  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", dept: "ទីផ្សារ", branch: "ការិយាល័យកណ្តាល", phone: "012 345 671", status: "សកម្ម", pin: "1001" },
  { id: "EMP-002", name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", dept: "IT", branch: "ការិយាល័យកណ្តាល", phone: "012 345 672", status: "សកម្ម", pin: "1002" },
  { id: "EMP-003", name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", dept: "គណនេយ្យ", branch: "សាខាទួលគោក", phone: "012 345 673", status: "សកម្ម", pin: "1003" },
  { id: "EMP-004", name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", dept: "ឥណទាន", branch: "សាខាសែនសុខ", phone: "012 345 674", status: "ឈប់សម្រាក", pin: "1004" },
  { id: "EMP-005", name: "អេក សុគន្ធ", role: "ធនធានមនុស្ស", dept: "HR", branch: "ការិយាល័យកណ្តាល", phone: "012 345 675", status: "សកម្ម", pin: "1005" },
  { id: "EMP-006", name: "ជា សុវណ្ណារ៉ា", role: "មន្ត្រីឥណទាន", dept: "ឥណទាន", branch: "សាខាព្រែកលៀប", phone: "012 345 676", status: "សកម្ម", pin: "1006" },
  { id: "EMP-007", name: "លី សុជាតា", role: "គិតលុយ", dept: "គិតលុយ", branch: "សាខាទួលគោក", phone: "012 345 677", status: "អសកម្ម", pin: "1007" },
  { id: "EMP-008", name: "ហេង ចាន់ថា", role: "អ្នកសវនកម្មផ្ទៃក្នុង", dept: "សវនកម្ម", branch: "ការិយាល័យកណ្តាល", phone: "012 345 678", status: "សកម្ម", pin: "1008" },
];

export const statusStyle = {
  "សកម្ម": { bg: "#E9F7EF", fg: "#3FA66B" },
  "ឈប់សម្រាក": { bg: "#FDF3E3", fg: "#E8A33D" },
  "អសកម្ម": { bg: "#F1F2F6", fg: "#8A8FA3" },
};

const attendanceTodayRaw = [
  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", branch: "ការិយាល័យកណ្តាល", shift: "ព្រឹក", checkIn: "08:05 AM", checkOut: "05:02 PM", hours: "8ម៉ោង 57នាទី", status: "មានវត្តមាន" },
  { id: "EMP-002", name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", branch: "ការិយាល័យកណ្តាល", shift: "ព្រឹក", checkIn: "08:12 AM", checkOut: "05:10 PM", hours: "8ម៉ោង 58នាទី", status: "មានវត្តមាន" },
  { id: "EMP-003", name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", branch: "សាខាទួលគោក", shift: "ព្រឹក", checkIn: "08:35 AM", checkOut: "05:00 PM", hours: "8ម៉ោង 25នាទី", status: "យឺត" },
  { id: "EMP-004", name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", branch: "សាខាសែនសុខ", shift: "ល្ងាច", checkIn: "—", checkOut: "—", hours: "—", status: "ច្បាប់" },
  { id: "EMP-005", name: "អេក សុគន្ធ", role: "ធនធានមនុស្ស", branch: "ការិយាល័យកណ្តាល", shift: "ព្រឹក", checkIn: "08:31 AM", checkOut: "05:05 PM", hours: "8ម៉ោង 34នាទី", status: "មានវត្តមាន" },
  { id: "EMP-006", name: "ជា សុវណ្ណារ៉ា", role: "មន្ត្រីឥណទាន", branch: "សាខាព្រែកលៀប", shift: "ល្ងាច", checkIn: "01:20 PM", checkOut: "—", hours: "កំពុងធ្វើការ", status: "មានវត្តមាន" },
  { id: "EMP-007", name: "លី សុជាតា", role: "គិតលុយ", branch: "សាខាទួលគោក", shift: "ព្រឹក", checkIn: "—", checkOut: "—", hours: "—", status: "អវត្តមាន" },
  { id: "EMP-008", name: "ហេង ចាន់ថា", role: "អ្នកសវនកម្មផ្ទៃក្នុង", branch: "ការិយាល័យកណ្តាល", shift: "ព្រឹក", checkIn: "08:48 AM", checkOut: "05:15 PM", hours: "8ម៉ោង 27នាទី", status: "យឺត" },
];

// One employee gets one record per day. `recordId` is the Firestore document
// key; `id` remains the human employee ID used throughout the UI.
const seedAttendanceDate = new Date().toISOString().slice(0, 10);
export const attendanceToday = attendanceTodayRaw.map((row) => ({
  ...row,
  dateISO: seedAttendanceDate,
  recordId: `${row.id}_${seedAttendanceDate}`,
}));

const historyDataRaw = [
  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", branch: "ការិយាល័យកណ្តាល", date: "១៩ កក្កដា ២០២៦", dateISO: "2026-07-19", shift: "ព្រឹក", checkIn: "08:05 AM", checkOut: "05:02 PM", hours: "8ម៉ោង 57នាទី", status: "មានវត្តមាន" },
  { id: "EMP-002", name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", branch: "ការិយាល័យកណ្តាល", date: "១៩ កក្កដា ២០២៦", dateISO: "2026-07-19", shift: "ព្រឹក", checkIn: "08:12 AM", checkOut: "05:10 PM", hours: "8ម៉ោង 58នាទី", status: "មានវត្តមាន" },
  { id: "EMP-003", name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", branch: "សាខាទួលគោក", date: "១៩ កក្កដា ២០២៦", dateISO: "2026-07-19", shift: "ព្រឹក", checkIn: "08:35 AM", checkOut: "05:00 PM", hours: "8ម៉ោង 25នាទី", status: "យឺត" },
  { id: "EMP-004", name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", branch: "សាខាសែនសុខ", date: "១៩ កក្កដា ២០២៦", dateISO: "2026-07-19", shift: "ល្ងាច", checkIn: "—", checkOut: "—", hours: "—", status: "ច្បាប់" },
  { id: "EMP-007", name: "លី សុជាតា", role: "គិតលុយ", branch: "សាខាទួលគោក", date: "១៩ កក្កដា ២០២៦", dateISO: "2026-07-19", shift: "ព្រឹក", checkIn: "—", checkOut: "—", hours: "—", status: "អវត្តមាន" },

  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", branch: "ការិយាល័យកណ្តាល", date: "១៨ កក្កដា ២០២៦", dateISO: "2026-07-18", shift: "ព្រឹក", checkIn: "07:58 AM", checkOut: "05:04 PM", hours: "9ម៉ោង 06នាទី", status: "មានវត្តមាន" },
  { id: "EMP-002", name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", branch: "ការិយាល័យកណ្តាល", date: "១៨ កក្កដា ២០២៦", dateISO: "2026-07-18", shift: "ព្រឹក", checkIn: "08:40 AM", checkOut: "05:09 PM", hours: "8ម៉ោង 29នាទី", status: "យឺត" },
  { id: "EMP-005", name: "អេក សុគន្ធ", role: "ធនធានមនុស្ស", branch: "ការិយាល័យកណ្តាល", date: "១៨ កក្កដា ២០២៦", dateISO: "2026-07-18", shift: "ព្រឹក", checkIn: "08:02 AM", checkOut: "05:00 PM", hours: "8ម៉ោង 58នាទី", status: "មានវត្តមាន" },
  { id: "EMP-006", name: "ជា សុវណ្ណារ៉ា", role: "មន្ត្រីឥណទាន", branch: "សាខាព្រែកលៀប", date: "១៨ កក្កដា ២០២៦", dateISO: "2026-07-18", shift: "ល្ងាច", checkIn: "01:15 PM", checkOut: "09:02 PM", hours: "7ម៉ោង 47នាទី", status: "មានវត្តមាន" },
  { id: "EMP-008", name: "ហេង ចាន់ថា", role: "អ្នកសវនកម្មផ្ទៃក្នុង", branch: "ការិយាល័យកណ្តាល", date: "១៨ កក្កដា ២០២៦", dateISO: "2026-07-18", shift: "ព្រឹក", checkIn: "—", checkOut: "—", hours: "—", status: "ច្បាប់" },

  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", branch: "ការិយាល័យកណ្តាល", date: "១៧ កក្កដា ២០២៦", dateISO: "2026-07-17", shift: "ព្រឹក", checkIn: "08:01 AM", checkOut: "05:00 PM", hours: "8ម៉ោង 59នាទី", status: "មានវត្តមាន" },
  { id: "EMP-003", name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", branch: "សាខាទួលគោក", date: "១៧ កក្កដា ២០២៦", dateISO: "2026-07-17", shift: "ព្រឹក", checkIn: "08:03 AM", checkOut: "05:01 PM", hours: "8ម៉ោង 58នាទី", status: "មានវត្តមាន" },
  { id: "EMP-004", name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", branch: "សាខាសែនសុខ", date: "១៧ កក្កដា ២០២៦", dateISO: "2026-07-17", shift: "ល្ងាច", checkIn: "01:05 PM", checkOut: "09:00 PM", hours: "7ម៉ោង 55នាទី", status: "មានវត្តមាន" },
  { id: "EMP-007", name: "លី សុជាតា", role: "គិតលុយ", branch: "សាខាទួលគោក", date: "១៧ កក្កដា ២០២៦", dateISO: "2026-07-17", shift: "ព្រឹក", checkIn: "09:10 AM", checkOut: "05:00 PM", hours: "7ម៉ោង 50នាទី", status: "យឺត" },
  { id: "EMP-008", name: "ហេង ចាន់ថា", role: "អ្នកសវនកម្មផ្ទៃក្នុង", branch: "ការិយាល័យកណ្តាល", date: "១៧ កក្កដា ២០២៦", dateISO: "2026-07-17", shift: "ព្រឹក", checkIn: "07:55 AM", checkOut: "05:03 PM", hours: "9ម៉ោង 08នាទី", status: "មានវត្តមាន" },

  { id: "EMP-002", name: "ឈយ វីរៈ", role: "ផ្នែកព័ត៌មានវិទ្យា", branch: "ការិយាល័យកណ្តាល", date: "១៦ កក្កដា ២០២៦", dateISO: "2026-07-16", shift: "ព្រឹក", checkIn: "—", checkOut: "—", hours: "—", status: "អវត្តមាន" },
  { id: "EMP-005", name: "អេក សុគន្ធ", role: "ធនធានមនុស្ស", branch: "ការិយាល័យកណ្តាល", date: "១៦ កក្កដា ២០២៦", dateISO: "2026-07-16", shift: "ព្រឹក", checkIn: "08:00 AM", checkOut: "05:01 PM", hours: "9ម៉ោង 01នាទី", status: "មានវត្តមាន" },
  { id: "EMP-006", name: "ជា សុវណ្ណារ៉ា", role: "មន្ត្រីឥណទាន", branch: "សាខាព្រែកលៀប", date: "១៦ កក្កដា ២០២៦", dateISO: "2026-07-16", shift: "ល្ងាច", checkIn: "01:22 PM", checkOut: "09:05 PM", hours: "7ម៉ោង 43នាទី", status: "មានវត្តមាន" },
  { id: "EMP-001", name: "សុខ ស្រីលក្ខណ៍", role: "មន្ត្រីទីផ្សារ", branch: "ការិយាល័យកណ្តាល", date: "១៦ កក្កដា ២០២៦", dateISO: "2026-07-16", shift: "ព្រឹក", checkIn: "08:44 AM", checkOut: "05:02 PM", hours: "8ម៉ោង 18នាទី", status: "យឺត" },

  { id: "EMP-003", name: "ង៉ែត សុភ័ណ្ណា", role: "គណនេយ្យករ", branch: "សាខាទួលគោក", date: "១៥ កក្កដា ២០២៦", dateISO: "2026-07-15", shift: "ព្រឹក", checkIn: "08:00 AM", checkOut: "05:00 PM", hours: "9ម៉ោង 00នាទី", status: "មានវត្តមាន" },
  { id: "EMP-004", name: "មាន ដាវិត", role: "មន្ត្រីឥណទាន", branch: "សាខាសែនសុខ", date: "១៥ កក្កដា ២០២៦", dateISO: "2026-07-15", shift: "ល្ងាច", checkIn: "—", checkOut: "—", hours: "—", status: "ច្បាប់" },
  { id: "EMP-007", name: "លី សុជាតា", role: "គិតលុយ", branch: "សាខាទួលគោក", date: "១៥ កក្កដា ២០២៦", dateISO: "2026-07-15", shift: "ព្រឹក", checkIn: "08:06 AM", checkOut: "05:01 PM", hours: "8ម៉ោង 55នាទី", status: "មានវត្តមាន" },
  { id: "EMP-008", name: "ហេង ចាន់ថា", role: "អ្នកសវនកម្មផ្ទៃក្នុង", branch: "ការិយាល័យកណ្តាល", date: "១៥ កក្កដា ២០២៦", dateISO: "2026-07-15", shift: "ព្រឹក", checkIn: "08:50 AM", checkOut: "05:00 PM", hours: "8ម៉ោង 10នាទី", status: "យឺត" },
];

// Each row shares its employee's `id` (e.g. "EMP-001") across many dates, so
// it can't be used as the Firestore document ID on its own — `docId` gives
// every row a unique key (still `id + dateISO`, so it's stable/deterministic
// and re-seeding never creates duplicates).
export const historyData = historyDataRaw.map((row) => ({ ...row, docId: `${row.id}_${row.dateISO}` }));

export const attendanceStatusStyle = {
  "មានវត្តមាន": { bg: "#E9F7EF", fg: "#3FA66B", icon: CheckCircle2 },
  "យឺត": { bg: "#FDF3E3", fg: "#E8A33D", icon: AlertCircle },
  "អវត្តមាន": { bg: "#FBEBE8", fg: "#D9614F", icon: XCircle },
  "ច្បាប់": { bg: "#F1EBFE", fg: "#8B5CF6", icon: Clock },
};

export const correctionStatusStyle = {
  "រង់ចាំពិនិត្យ": { bg: "#FDF3E3", fg: "#E8A33D" },
  "បានអនុម័ត": { bg: "#E9F7EF", fg: "#3FA66B" },
  "បានបដិសេធ": { bg: "#FBEBE8", fg: "#D9614F" },
};

export const initialCorrections = [
  {
    id: "COR-001",
    empId: "EMP-003",
    name: "ង៉ែត សុភ័ណ្ណា",
    role: "គណនេយ្យករ",
    branch: "សាខាទួលគោក",
    date: "១៩ កក្កដា ២០២៦",
    originalCheckIn: "08:35 AM",
    originalCheckOut: "05:00 PM",
    originalStatus: "យឺត",
    newCheckIn: "08:00 AM",
    newCheckOut: "05:00 PM",
    newStatus: "មានវត្តមាន",
    reason: "ម៉ាស៊ីនស្កេនម្រាមដៃខូច សូមកែជាម៉ោងចូលធ្វើការពិត",
    requestedBy: "ង៉ែត សុភ័ណ្ណា",
    status: "រង់ចាំពិនិត្យ",
  },
  {
    id: "COR-002",
    empId: "EMP-007",
    name: "លី សុជាតា",
    role: "គិតលុយ",
    branch: "សាខាទួលគោក",
    date: "១៩ កក្កដា ២០២៦",
    originalCheckIn: "—",
    originalCheckOut: "—",
    originalStatus: "អវត្តមាន",
    newCheckIn: "08:10 AM",
    newCheckOut: "05:00 PM",
    newStatus: "មានវត្តមាន",
    reason: "បុគ្គលិកភ្លេចស្កេន QR ប៉ុន្តែមានវត្តមានធ្វើការជាក់ស្តែង",
    requestedBy: "ចាន់ បូរ៉ា",
    status: "រង់ចាំពិនិត្យ",
  },
  {
    id: "COR-003",
    empId: "EMP-008",
    name: "ហេង ចាន់ថា",
    role: "អ្នកសវនកម្មផ្ទៃក្នុង",
    branch: "ការិយាល័យកណ្តាល",
    date: "១៧ កក្កដា ២០២៦",
    originalCheckIn: "07:55 AM",
    originalCheckOut: "05:03 PM",
    originalStatus: "មានវត្តមាន",
    newCheckIn: "07:55 AM",
    newCheckOut: "06:15 PM",
    newStatus: "មានវត្តមាន",
    reason: "ធ្វើការបន្ថែមម៉ោងសវនកម្មបិទបញ្ជីខែ",
    requestedBy: "ហេង ចាន់ថា",
    status: "បានអនុម័ត",
  },
  {
    id: "COR-004",
    empId: "EMP-002",
    name: "ឈយ វីរៈ",
    role: "ផ្នែកព័ត៌មានវិទ្យា",
    branch: "ការិយាល័យកណ្តាល",
    date: "១៦ កក្កដា ២០២៦",
    originalCheckIn: "—",
    originalCheckOut: "—",
    originalStatus: "អវត្តមាន",
    newCheckIn: "08:30 AM",
    newCheckOut: "05:00 PM",
    newStatus: "មានវត្តមាន",
    reason: "សំណើគ្មានភស្តុតាងគាំទ្រគ្រប់គ្រាន់",
    requestedBy: "ឈយ វីរៈ",
    status: "បានបដិសេធ",
  },
];

export const leaveTypeStyle = {
  "ច្បាប់ប្រចាំឆ្នាំ": { bg: COLORS.primaryLight, fg: COLORS.primary },
  "ច្បាប់ឈឺ": { bg: COLORS.greenLight, fg: COLORS.green },
  "ច្បាប់ផ្ទាល់ខ្លួន": { bg: COLORS.amberLight, fg: COLORS.accent },
  "ច្បាប់ផ្សេងៗ": { bg: COLORS.purpleLight, fg: COLORS.purple },
};

export const leaveTypes = ["ច្បាប់ប្រចាំឆ្នាំ", "ច្បាប់ឈឺ", "ច្បាប់ផ្ទាល់ខ្លួន", "ច្បាប់ផ្សេងៗ"];

// Annual leave entitlement (days/year) per leave type, per employee

export const leaveQuotas = {
  "ច្បាប់ប្រចាំឆ្នាំ": 18,
  "ច្បាប់ឈឺ": 7,
  "ច្បាប់ផ្ទាល់ខ្លួន": 3,
  "ច្បាប់ផ្សេងៗ": 5,
};

export const initialLeaveRequests = [
  {
    id: "LV-001",
    empId: "EMP-004",
    name: "មាន ដាវិត",
    role: "មន្ត្រីឥណទាន",
    branch: "សាខាសែនសុខ",
    leaveType: "ច្បាប់ឈឺ",
    startDate: "១៩ កក្កដា ២០២៦",
    endDate: "២០ កក្កដា ២០២៦",
    days: 2,
    reason: "ឈឺក្តៅ ត្រូវសម្រាកតាមការណែនាំរបស់វេជ្ជបណ្ឌិត",
    requestedBy: "មាន ដាវិត",
    requestedOn: "១៨ កក្កដា ២០២៦",
    status: "រង់ចាំពិនិត្យ",
  },
  {
    id: "LV-002",
    empId: "EMP-008",
    name: "ហេង ចាន់ថា",
    role: "អ្នកសវនកម្មផ្ទៃក្នុង",
    branch: "ការិយាល័យកណ្តាល",
    leaveType: "ច្បាប់ប្រចាំឆ្នាំ",
    startDate: "១៨ កក្កដា ២០២៦",
    endDate: "១៨ កក្កដា ២០២៦",
    days: 1,
    reason: "កិច្ចការគ្រួសារបន្ទាន់",
    requestedBy: "ហេង ចាន់ថា",
    requestedOn: "១៤ កក្កដា ២០២៦",
    status: "បានអនុម័ត",
  },
  {
    id: "LV-003",
    empId: "EMP-006",
    name: "ជា សុវណ្ណារ៉ា",
    role: "មន្ត្រីឥណទាន",
    branch: "សាខាព្រែកលៀប",
    leaveType: "ច្បាប់ផ្ទាល់ខ្លួន",
    startDate: "២២ កក្កដា ២០២៦",
    endDate: "២២ កក្កដា ២០២៦",
    days: 1,
    reason: "រៀបចំកិច្ចការគ្រួសារបន្ទាន់",
    requestedBy: "ជា សុវណ្ណារ៉ា",
    requestedOn: "១៧ កក្កដា ២០២៦",
    status: "រង់ចាំពិនិត្យ",
  },
  {
    id: "LV-004",
    empId: "EMP-007",
    name: "លី សុជាតា",
    role: "គិតលុយ",
    branch: "សាខាទួលគោក",
    leaveType: "ច្បាប់ឈឺ",
    startDate: "១៦ កក្កដា ២០២៦",
    endDate: "១៦ កក្កដា ២០២៦",
    days: 1,
    reason: "ឈឺក្បាល និងគ្រុនក្តៅ",
    requestedBy: "លី សុជាតា",
    requestedOn: "១៥ កក្កដា ២០២៦",
    status: "បានបដិសេធ",
  },
  {
    id: "LV-005",
    empId: "EMP-001",
    name: "សុខ ស្រីលក្ខណ៍",
    role: "មន្ត្រីទីផ្សារ",
    branch: "ការិយាល័យកណ្តាល",
    leaveType: "ច្បាប់ប្រចាំឆ្នាំ",
    startDate: "២៥ កក្កដា ២០២៦",
    endDate: "២៨ កក្កដា ២០២៦",
    days: 4,
    reason: "ធ្វើដំណើរកម្សាន្តជាមួយគ្រួសារ",
    requestedBy: "សុខ ស្រីលក្ខណ៍",
    requestedOn: "១២ កក្កដា ២០២៦",
    status: "បានអនុម័ត",
  },
];

export const initialBranches = [
  { id: "BR-001", name: "ការិយាល័យកណ្តាល", type: "ការិយាល័យកណ្តាល", address: "ផ្លូវ ២៧១, សង្កាត់ទឹកល្អក់, ខណ្ឌទួលគោក, ភ្នំពេញ", manager: "អេក សុគន្ធ", phone: "023 456 001" },
  { id: "BR-002", name: "សាខាទួលគោក", type: "សាខា", address: "ផ្លូវ ១៩៩, សង្កាត់បឹងកក់ទី១, ខណ្ឌទួលគោក, ភ្នំពេញ", manager: "ង៉ែត សុភ័ណ្ណា", phone: "023 456 002" },
  { id: "BR-003", name: "សាខាសែនសុខ", type: "សាខា", address: "ផ្លូវ ២០០២, សង្កាត់ភ្នំពេញថ្មី, ខណ្ឌសែនសុខ, ភ្នំពេញ", manager: "មាន ដាវិត", phone: "023 456 003" },
  { id: "BR-004", name: "សាខាព្រែកលៀប", type: "សាខា", address: "ផ្លូវជាតិលេខ៦, សង្កាត់ព្រែកលៀប, ខណ្ឌជ្រោយចង្វារ, ភ្នំពេញ", manager: "ជា សុវណ្ណារ៉ា", phone: "023 456 004" },
];

export const initialDepartments = [
  { id: "DEPT-001", name: "ទីផ្សារ", head: "សុខ ស្រីលក្ខណ៍", description: "ទទួលបន្ទុកយុទ្ធសាស្ត្រទីផ្សារ និងផ្សព្វផ្សាយផលិតផល" },
  { id: "DEPT-002", name: "IT", head: "ឈយ វីរៈ", description: "គ្រប់គ្រងហេដ្ឋារចនាសម្ព័ន្ធបច្ចេកវិទ្យា និងប្រព័ន្ធព័ត៌មាន" },
  { id: "DEPT-003", name: "គណនេយ្យ", head: "ង៉ែត សុភ័ណ្ណា", description: "គ្រប់គ្រងគណនី និងរបាយការណ៍ហិរញ្ញវត្ថុ" },
  { id: "DEPT-004", name: "ឥណទាន", head: "មាន ដាវិត", description: "វិភាគ និងអនុម័តកម្ចីសម្រាប់អតិថិជន" },
  { id: "DEPT-005", name: "HR", head: "អេក សុគន្ធ", description: "គ្រប់គ្រងធនធានមនុស្ស និងកិច្ចការបុគ្គលិក" },
  { id: "DEPT-006", name: "គិតលុយ", head: "លី សុជាតា", description: "ដោះស្រាយប្រតិបត្តិការសាច់ប្រាក់ប្រចាំថ្ងៃ" },
  { id: "DEPT-007", name: "សវនកម្ម", head: "ហេង ចាន់ថា", description: "ត្រួតពិនិត្យ និងធានាការអនុលោមតាមបទប្បញ្ញត្តិ" },
];

export const initialJobRoles = [
  { id: "ROLE-001", name: "មន្ត្រីទីផ្សារ", dept: "ទីផ្សារ", level: "បុគ្គលិក" },
  { id: "ROLE-002", name: "ផ្នែកព័ត៌មានវិទ្យា", dept: "IT", level: "បុគ្គលិក" },
  { id: "ROLE-003", name: "គណនេយ្យករ", dept: "គណនេយ្យ", level: "បុគ្គលិក" },
  { id: "ROLE-004", name: "មន្ត្រីឥណទាន", dept: "ឥណទាន", level: "បុគ្គលិក" },
  { id: "ROLE-005", name: "ធនធានមនុស្ស", dept: "HR", level: "គ្រប់គ្រង" },
  { id: "ROLE-006", name: "គិតលុយ", dept: "គិតលុយ", level: "បុគ្គលិក" },
  { id: "ROLE-007", name: "អ្នកសវនកម្មផ្ទៃក្នុង", dept: "សវនកម្ម", level: "គ្រប់គ្រង" },
];

export const initialHolidays = [
  { id: "HOL-001", dateISO: "2026-01-01", name: "ចូលឆ្នាំសាកល" },
  { id: "HOL-002", dateISO: "2026-01-07", name: "ទិវាជ័យជម្នះ ៧ មករា" },
  { id: "HOL-003", dateISO: "2026-03-08", name: "ទិវាអន្តរជាតិនារី" },
  { id: "HOL-004", dateISO: "2026-04-14", name: "បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី១)" },
  { id: "HOL-005", dateISO: "2026-04-15", name: "បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី២)" },
  { id: "HOL-006", dateISO: "2026-04-16", name: "បុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ (ថ្ងៃទី៣)" },
  { id: "HOL-007", dateISO: "2026-05-01", name: "ទិវាពលកម្មអន្តរជាតិ" },
  { id: "HOL-008", dateISO: "2026-05-14", name: "ព្រះរាជពិធីបុណ្យវិសាខបូជា" },
  { id: "HOL-009", dateISO: "2026-06-18", name: "ព្រះរាជពិធីអភិសេករាជព្យាភិសេក" },
  { id: "HOL-010", dateISO: "2026-09-22", name: "ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃទី១)" },
  { id: "HOL-011", dateISO: "2026-09-23", name: "ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃទី២)" },
  { id: "HOL-012", dateISO: "2026-09-24", name: "ថ្ងៃរដ្ឋធម្មនុញ្ញ / ពិធីបុណ្យភ្ជុំបិណ្ឌ (ថ្ងៃទី៣)" },
  { id: "HOL-013", dateISO: "2026-10-29", name: "ព្រះរាជពិធីគ្រងរាជ្យសម្បត្តិ" },
  { id: "HOL-014", dateISO: "2026-11-09", name: "ថ្ងៃឯករាជ្យជាតិ" },
  { id: "HOL-015", dateISO: "2026-11-24", name: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្តែតប្រទីប អកអំបុក" },
];

export const monthNamesKh = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];

export const dayLabelsKh = ["អា", "ច", "អ", "ព", "ព្រ", "សុ", "ស"];

export const TODAY_ISO = "2026-07-19";

export const initialUsers = [
  { id: "USR-001", name: "ចាន់ បូរ៉ា", email: "chan.bora@borribo.com.kh", role: "អ្នកគ្រប់គ្រងប្រព័ន្ធ", branch: "ការិយាល័យកណ្តាល", status: "សកម្ម" },
  { id: "USR-002", name: "អេក សុគន្ធ", email: "ek.sokun@borribo.com.kh", role: "HR", branch: "ការិយាល័យកណ្តាល", status: "សកម្ម" },
  { id: "USR-003", name: "ង៉ែត សុភ័ណ្ណា", email: "ngeat.sophanna@borribo.com.kh", role: "គណនេយ្យករ", branch: "សាខាទួលគោក", status: "សកម្ម" },
  { id: "USR-004", name: "មាន ដាវិត", email: "mean.davit@borribo.com.kh", role: "អ្នកគ្រប់គ្រងសាខា", branch: "សាខាសែនសុខ", status: "អសកម្ម" },
];

export const initialRoles = [
  { id: "ROLE-A", name: "អ្នកគ្រប់គ្រងប្រព័ន្ធ", description: "សិទ្ធិពេញលេញលើប្រព័ន្ធទាំងមូល រួមទាំងការកំណត់ និងអ្នកប្រើប្រាស់", color: COLORS.red },
  { id: "ROLE-B", name: "អ្នកគ្រប់គ្រងសាខា", description: "គ្រប់គ្រងបុគ្គលិក វត្តមាន និងច្បាប់ក្នុងសាខារបស់ខ្លួន", color: COLORS.primary },
  { id: "ROLE-C", name: "HR", description: "គ្រប់គ្រងទិន្នន័យបុគ្គលិក និងសំណើច្បាប់ទូទាំងក្រុមហ៊ុន", color: COLORS.purple },
  { id: "ROLE-D", name: "បុគ្គលិក", description: "មើលព័ត៌មានផ្ទាល់ខ្លួន និងស្នើសុំច្បាប់ ឬកែតម្រូវវត្តមាន", color: COLORS.green },
];
