import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
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

export async function getEmployeeBackendStatus() {
  if (!workerUrl) return { ok: false, configured: false, error: "មិនទាន់កំណត់ VITE_TELEGRAM_WORKER_URL" };
  try {
    const response = await fetch(`${workerUrl}/health`, { headers: { accept: "application/json" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.adminConfigured) {
      return { ok: false, configured: false, error: result.error || "Worker មិនទាន់មាន Firebase Secrets គ្រប់គ្រាន់" };
    }
    return { ok: true, configured: true };
  } catch {
    return { ok: false, configured: false, error: "មិនអាចភ្ជាប់ទៅ Employee Worker បានទេ" };
  }
}

export async function auditLoginAccounts(repair = false) {
  return adminRequest("/api/admin/login-accounts/audit", { repair });
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
  return adminRequest("/api/admin/employees/create", { employee: data, account: account || { enabled: false } });
}

export async function updateEmployee(employee) {
  const data = { ...employee, updatedAt: new Date().toISOString() };
  const result = await adminRequest("/api/admin/employees/update", { employee: data });
  return result.employee;
}

export async function provisionEmployeeAccount(employee, account) {
  if (!employee?.id) throw new Error("រកមិនឃើញលេខសម្គាល់បុគ្គលិក");
  return adminRequest("/api/admin/employees/provision-account", { employeeId: employee.id, account });
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
  return adminRequest("/api/admin/employees/deactivate", { employeeId: employee.id, uid: employee.uid || "" });
}

export async function reactivateEmployee(employee, rehire = {}) {
  return adminRequest("/api/admin/employees/reactivate", {
    employeeId: employee.id,
    uid: employee.uid || "",
    rehireDate: rehire.rehireDate || "",
    reason: rehire.reason || "",
  });
}

export async function deleteEmployeeLoginAccount(employee) {
  if (!employee?.id) throw new Error("រកមិនឃើញលេខសម្គាល់បុគ្គលិក");
  return adminRequest("/api/admin/employees/delete-account", {
    employeeId: employee.id,
    uid: employee.uid || "",
  });
}
