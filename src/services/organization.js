import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function organizationRequest(action, payload = {}) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ជាមុន");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const response = await fetch(`${workerUrl}/api/admin/organization/mutate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Organization Worker error (${response.status})`);
  return result;
}

export const saveBranch = (branchId, branch) => organizationRequest(branchId ? "branch.update" : "branch.create", { branchId, branch });
export const toggleBranchStatus = (branchId) => organizationRequest("branch.toggle-status", { branchId });
export const saveDepartment = (departmentId, department) => organizationRequest(departmentId ? "department.update" : "department.create", { departmentId, department });
export const toggleDepartmentStatus = (departmentId) => organizationRequest("department.toggle-status", { departmentId });
export const saveJobRole = (roleId, role) => organizationRequest(roleId ? "job-role.update" : "job-role.create", { roleId, role });
export const toggleJobRoleStatus = (roleId) => organizationRequest("job-role.toggle-status", { roleId });
export const saveHoliday = (holidayId, holiday) => organizationRequest(holidayId ? "holiday.update" : "holiday.create", { holidayId, holiday });
export const deleteHoliday = (holidayId) => organizationRequest("holiday.delete", { holidayId });

export const saveGpsQrConfiguration = (configuration) => organizationRequest("gps-qr.save", { configuration });
