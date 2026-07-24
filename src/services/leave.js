import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function leaveRequest(action, payload = {}) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ជាមុន");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const response = await fetch(`${workerUrl}/api/leave/mutate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${await user.getIdToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Leave Worker error (${response.status})`);
  return result;
}

export const createLeaveRequest = (request) => leaveRequest("leave.create", { request });
export const cancelLeaveRequest = (requestId) => leaveRequest("leave.cancel", { requestId });
export const decideLeaveRequest = (requestId, decision, reason = "") => leaveRequest("leave.decide", { requestId, decision, reason });
export const updateLeaveDocumentReceipt = (requestId, received) => leaveRequest("leave.document-receipt", { requestId, received });
