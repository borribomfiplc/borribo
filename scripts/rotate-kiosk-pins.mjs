// Rotates all employee kiosk PINs so PINs previously seeded from frontend demo
// data are no longer valid. Run this once after deploying the Critical patch.
// The generated mapping is printed only to the local terminal.
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
  console.error(`Could not read ${keyPath}. Download a Firebase service-account key and save it there first.`);
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function nextUniquePin(usedPins) {
  for (let attempt = 0; attempt < 20_000; attempt += 1) {
    const pin = String(randomInt(0, 10_000)).padStart(4, "0");
    if (!usedPins.has(pin)) {
      usedPins.add(pin);
      return pin;
    }
  }
  throw new Error("Could not generate enough unique 4-digit PINs");
}

const snapshot = await db.collection("employees").get();
const employees = snapshot.docs.map((document) => ({ ref: document.ref, id: document.id, ...document.data() }));
if (employees.length > 10_000) throw new Error("4-digit PINs support at most 10,000 unique employees");

const usedPins = new Set();
const rows = employees.map((employee) => ({
  employee,
  pin: nextUniquePin(usedPins),
}));

for (let start = 0; start < rows.length; start += 400) {
  const batch = db.batch();
  rows.slice(start, start + 400).forEach(({ employee, pin }) => {
    batch.set(employee.ref, {
      pin,
      pinRotatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
}

console.log(`Rotated kiosk PINs for ${rows.length} employees.`);
console.table(rows.map(({ employee, pin }) => ({
  employeeId: employee.id,
  name: employee.name || "",
  branch: employee.branch || "",
  pin,
})));
console.log("Store this mapping securely and close the terminal after distribution.");
process.exit(0);
