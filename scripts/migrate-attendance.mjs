// Converts older attendanceToday document IDs (EMP-001) into the current
// one-employee-per-day format (EMP-001_YYYY-MM-DD). Run once after upgrading
// an existing Firebase project. It only migrates records without `recordId`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");
let serviceAccount;
try { serviceAccount = JSON.parse(readFileSync(keyPath, "utf8")); }
catch { throw new Error("Missing serviceAccountKey.json in the project root."); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const today = new Date().toISOString().slice(0, 10);
const snapshot = await db.collection("attendanceToday").get();
let migrated = 0;
for (const source of snapshot.docs) {
  const record = source.data();
  if (record.recordId) continue;
  const recordId = `${record.id}_${record.dateISO || today}`;
  const destination = db.collection("attendanceToday").doc(recordId);
  await destination.set({ ...record, dateISO: record.dateISO || today, recordId }, { merge: true });
  await source.ref.delete();
  migrated += 1;
}
console.log(`Migrated ${migrated} attendance record(s).`);
