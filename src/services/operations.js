import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function operationsRequest(action, payload = {}) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ជាមុន ដើម្បីប្រើ workflow សុវត្ថិភាព");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const response = await fetch(`${workerUrl}/api/admin/operations/mutate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `Operations Worker error (${response.status})`);
  }
  return result;
}

export const createStaffLoan = (loan) => operationsRequest("loan.create", { loan });
export const updateStaffLoan = (loanId, patch) => operationsRequest("loan.update", { loanId, patch });
export const decideStaffLoan = (loanId, decision, note = "") => operationsRequest("loan.decide", { loanId, decision, note });
export const recordStaffLoanPayment = (loanId, payment) => operationsRequest("loan.payment", { loanId, payment });
export const cancelStaffLoan = (loanId, reason) => operationsRequest("loan.cancel", { loanId, reason });

export const createAsset = (asset) => operationsRequest("asset.create", { asset });
export const updateAsset = (assetId, patch) => operationsRequest("asset.update", { assetId, patch });
export const transferAsset = (assetId, transfer) => operationsRequest("asset.transfer", { assetId, transfer });
export const recordAssetMaintenance = (assetId, maintenance) => operationsRequest("asset.maintenance", { assetId, maintenance });
export const updateAssetMaintenance = (assetId, maintenanceId, maintenance) => operationsRequest("asset.maintenance.update", { assetId, maintenanceId, maintenance });
export const submitAsset = (assetId) => operationsRequest("asset.submit", { assetId });
export const reviewAsset = (assetId, decision, comment = "") => operationsRequest("asset.review", { assetId, decision, comment });

export const createKpi = (kpi) => operationsRequest("kpi.create", { kpi });
export const updateKpi = (kpiId, patch) => operationsRequest("kpi.update", { kpiId, patch });
export const submitKpi = (kpiId) => operationsRequest("kpi.submit", { kpiId });
export const reviewKpi = (kpiId, decision, comment = "") => operationsRequest("kpi.review", { kpiId, decision, comment });

export const createPayrollRecord = (payroll) => operationsRequest("payroll.create", { payroll });
export const updatePayrollRecord = (payrollId, patch) => operationsRequest("payroll.update", { payrollId, patch });
export const submitPayrollRecord = (payrollId) => operationsRequest("payroll.submit", { payrollId });
export const reviewPayrollRecord = (payrollId, decision, comment = "") => operationsRequest("payroll.review", { payrollId, decision, comment });
export const markPayrollPaid = (payrollId, payment) => operationsRequest("payroll.pay", { payrollId, payment });
