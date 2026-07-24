// Canonicalizes legacy attendance document IDs to EMPLOYEE_ID_YYYY-MM-DD in
// both attendanceToday and attendanceHistory. It also merges old fingerprint
// records that used EMPLOYEE_ID-YYYY-MM-DD, preserving the richer record when
// a canonical destination already exists.
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
const cambodiaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const useful = (value) => value != null && value !== "" && value !== "—";
const richness = (record = {}) => [
  record.checkIn, record.checkOut, record.checkInAt, record.checkOutAt,
  record.hours, record.status, record.branchId, record.uid,
].filter(useful).length;

function identity(record, documentId, collectionName) {
  const dateFromId = String(documentId).match(/(?:_|-)(\d{4}-\d{2}-\d{2})$/)?.[1] || "";
  const dateISO = validDate(record.dateISO) ? record.dateISO : (validDate(dateFromId) ? dateFromId : (collectionName === "attendanceToday" ? cambodiaDate : ""));
  const employeeId = String(record.id || record.employeeId || record.empId || "").trim();
  if (!employeeId || !dateISO) return null;
  return { employeeId, dateISO, recordId: `${employeeId}_${dateISO}` };
}

function mergedRecord(source, destination, ids, collectionName) {
  const primary = richness(destination) >= richness(source) ? destination : source;
  const secondary = primary === source ? destination : source;
  return {
    ...secondary,
    ...primary,
    id: ids.employeeId,
    employeeId: primary.employeeId || secondary.employeeId || ids.employeeId,
    dateISO: ids.dateISO,
    recordId: ids.recordId,
    docId: ids.recordId,
    migratedAt: new Date().toISOString(),
    migrationSource: collectionName,
  };
}

let batch = db.batch();
let operations = 0;
let migrated = 0;
let skipped = 0;

async function flush() {
  if (!operations) return;
  await batch.commit();
  batch = db.batch();
  operations = 0;
}

for (const collectionName of ["attendanceToday", "attendanceHistory"]) {
  const snapshot = await db.collection(collectionName).get();
  for (const sourceDoc of snapshot.docs) {
    const source = sourceDoc.data();
    const ids = identity(source, sourceDoc.id, collectionName);
    if (!ids) { skipped += 1; continue; }

    const destinationRef = db.collection(collectionName).doc(ids.recordId);
    const destinationDoc = sourceDoc.id === ids.recordId ? sourceDoc : await destinationRef.get();
    const destination = destinationDoc.exists ? destinationDoc.data() : {};
    const next = mergedRecord(source, destination, ids, collectionName);

    batch.set(destinationRef, next, { merge: true });
    operations += 1;
    if (sourceDoc.id !== ids.recordId) {
      batch.delete(sourceDoc.ref);
      operations += 1;
    }
    migrated += 1;
    if (operations >= 400) await flush();
  }
}

await flush();
console.log(`Canonicalized ${migrated} attendance record(s); skipped ${skipped} record(s) without a usable employee/date identity.`);
