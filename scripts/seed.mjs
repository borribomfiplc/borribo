// Seeds a Firebase project's Firestore with the app's demo data so you have
// something to look at immediately after connecting a fresh project.
//
// Usage:
//   1. Firebase Console → Project settings → Service accounts →
//      "Generate new private key". Save the downloaded file as
//      `serviceAccountKey.json` in the project root (it's gitignored).
//   2. npm run seed
//
// Safe to re-run: it overwrites documents by their existing `id` field
// rather than duplicating them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));
} catch {
  console.error(
    `\n❌ Could not read ${keyPath}\n\n` +
      `Download a service account key from Firebase Console → Project settings\n` +
      `→ Service accounts → "Generate new private key", save it as\n` +
      `serviceAccountKey.json in the project root, then run "npm run seed" again.\n`
  );
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const {
  initialEmployees,
  attendanceToday,
  historyData,
  initialLeaveRequests,
  initialCorrections,
  initialBranches,
  initialDepartments,
  initialJobRoles,
  initialHolidays,
  initialUsers,
  initialRoles,
} = await import("../src/data/mockData.js");

const collections = {
  employees: initialEmployees,
  attendanceToday: attendanceToday,
  attendanceHistory: historyData, // uses row.docId as the doc key, not row.id — see mockData.js
  leaveRequests: initialLeaveRequests,
  corrections: initialCorrections,
  branches: initialBranches,
  departments: initialDepartments,
  jobRoles: initialJobRoles,
  holidays: initialHolidays,
  users: initialUsers,
  roles: initialRoles,
};

for (const [name, rows] of Object.entries(collections)) {
  const batch = db.batch();
  rows.forEach((row) => batch.set(db.collection(name).doc(String(row.docId ?? row.id)), row));
  await batch.commit();
  console.log(`✅ Seeded ${rows.length} docs into "${name}"`);
}

console.log("\nDone. Open the Firebase Console → Firestore Database to see your data.");
process.exit(0);
