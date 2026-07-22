// One-time migration for installations created before v49. It backfills stable
// branch/department/role IDs on employee and job-role documents while keeping
// all legacy name fields for backwards compatibility.
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

const [branchSnap, departmentSnap, roleSnap, employeeSnap] = await Promise.all([
  db.collection("branches").get(),
  db.collection("departments").get(),
  db.collection("jobRoles").get(),
  db.collection("employees").get(),
]);

const byName = (snapshot) => new Map(snapshot.docs.map((item) => [String(item.data().name || "").trim().toLowerCase(), item.id]));
const branchIds = byName(branchSnap);
const departmentIds = byName(departmentSnap);
const roleIds = byName(roleSnap);
const normalized = (value) => String(value || "").trim().toLowerCase();

let writes = 0;
let pending = 0;
let batch = db.batch();
const commitIfNeeded = async (force = false) => {
  if (pending && (pending >= 400 || force)) { await batch.commit(); batch = db.batch(); pending = 0; }
};

for (const roleDoc of roleSnap.docs) {
  const role = roleDoc.data();
  const departmentId = departmentIds.get(normalized(role.dept)) || "";
  batch.set(roleDoc.ref, { id: role.id || roleDoc.id, departmentId, status: role.status || "សកម្ម" }, { merge: true });
  writes += 1;
  pending += 1;
  await commitIfNeeded();
}

for (const employeeDoc of employeeSnap.docs) {
  const employee = employeeDoc.data();
  batch.set(employeeDoc.ref, {
    id: employee.id || employeeDoc.id,
    branchId: branchIds.get(normalized(employee.branch)) || employee.branchId || "",
    departmentId: departmentIds.get(normalized(employee.dept)) || employee.departmentId || "",
    roleId: roleIds.get(normalized(employee.role)) || employee.roleId || "",
  }, { merge: true });
  writes += 1;
  pending += 1;
  await commitIfNeeded();
}

await commitIfNeeded(true);
console.log(`Backfilled organization IDs in ${writes} document(s).`);
