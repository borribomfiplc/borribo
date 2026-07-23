import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

export function isSystemWorkerConfigured() {
  return Boolean(workerUrl);
}

async function systemRequest(path, body = {}) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ក្នុង Cloudflare Pages ជាមុន");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const token = await user.getIdToken();
  const response = await fetch(`${workerUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `System Worker error (${response.status})`);
  }
  return result;
}

export function getSystemRuntimeStatus() {
  return systemRequest("/api/admin/system/status");
}

export function runSystemBackup() {
  return systemRequest("/api/admin/system/backup");
}

export function testSystemEmail() {
  return systemRequest("/api/admin/system/test-email");
}
