import { deleteDoc, doc, runTransaction, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function adminRequest(path, body) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ជាមុន ដើម្បីគ្រប់គ្រង Login Account");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const response = await fetch(`${workerUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Worker error (${response.status})`);
  return result;
}

export async function reserveEmployeeId(minimum = 1) {
  const counterRef = doc(db, "counters", "employees");
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = Math.max(Number(snapshot.data()?.next || 1), Number(minimum || 1));
    transaction.set(counterRef, { next: current + 1, updatedAt: serverTimestamp() }, { merge: true });
    return `EMP-${String(current).padStart(4, "0")}`;
  });
}

export async function createEmployee(employee, account, minimumId = 1) {
  const id = await reserveEmployeeId(minimumId);
  const data = { ...employee, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (account?.enabled) return adminRequest("/api/admin/employees/create", { employee: data, account });
  await setDoc(doc(db, "employees", id), data);
  return { ok: true, employee: data };
}

export async function updateEmployee(employee) {
  const data = { ...employee, updatedAt: new Date().toISOString() };
  if (employee.uid) {
    const result = await adminRequest("/api/admin/employees/update", { employee: data });
    return result.employee;
  }
  await updateDoc(doc(db, "employees", employee.id), data);
  return data;
}

export async function createEmploymentAction(employee, action) {
  if (!employee?.id) throw new Error("រកមិនឃើញលេខសម្គាល់បុគ្គលិក");
  return adminRequest("/api/admin/employment-actions/create", {
    employeeId: employee.id,
    action,
  });
}

export async function cancelEmploymentAction(actionId) {
  if (!actionId) throw new Error("រកមិនឃើញលេខសម្គាល់ប្រតិបត្តិការ");
  return adminRequest("/api/admin/employment-actions/cancel", { actionId });
}

export async function removeEmployee(employee) {
  if (employee.uid) return adminRequest("/api/admin/employees/deactivate", { employeeId: employee.id, uid: employee.uid });
  await deleteDoc(doc(db, "employees", employee.id));
  return { ok: true };
}
