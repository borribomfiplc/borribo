// Seeds a Firebase project's Firestore with the app's demo data so you have
// something to look at immediately after connecting a fresh project.
//
// Usage:
//   1. Firebase Console → Project settings → Service accounts →
//      "Generate new private key". Save the downloaded file as
//      `serviceAccountKey.json` in the project root (it's gitignored).
//   2. npm run seed
//
// Safe to re-run: it merges demo fields by existing `id` field, preserving
// the uid/email link created later by scripts/provision-users.mjs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomInt } from "node:crypto";
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
  roles: initialRoles,
};

function newUniquePin(usedPins) {
  for (let attempt = 0; attempt < 20_000; attempt += 1) {
    const pin = String(randomInt(0, 10_000)).padStart(4, "0");
    if (!usedPins.has(pin)) {
      usedPins.add(pin);
      return pin;
    }
  }
  throw new Error("Could not generate a unique 4-digit kiosk PIN");
}

const generatedPins = [];
for (const [name, rows] of Object.entries(collections)) {
  const batch = db.batch();
  if (name === "employees") {
    const existing = await Promise.all(rows.map((row) => db.collection(name).doc(String(row.id)).get()));
    const usedPins = new Set(existing.map((snapshot) => String(snapshot.data()?.pin || "")).filter(Boolean));
    rows.forEach((row, index) => {
      const currentPin = String(existing[index].data()?.pin || "");
      const pin = /^\d{4}$/.test(currentPin) ? currentPin : newUniquePin(usedPins);
      if (!/^\d{4}$/.test(currentPin)) generatedPins.push({ employeeId: row.id, name: row.name, pin });
      batch.set(db.collection(name).doc(String(row.id)), { ...row, pin }, { merge: true });
    });
  } else {
    rows.forEach((row) => batch.set(db.collection(name).doc(String(row.docId ?? row.id)), row, { merge: true }));
  }
  await batch.commit();
  console.log(`✅ Seeded ${rows.length} docs into "${name}"`);
}

if (generatedPins.length) {
  console.log("\n🔐 Newly generated kiosk PINs (store securely; they are not bundled into the web app):");
  console.table(generatedPins);
}

console.log("\nDone. Open the Firebase Console → Firestore Database to see your data.");
process.exit(0);
