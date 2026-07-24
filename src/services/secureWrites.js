import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

async function workerRequest(path, body, authenticated = true) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ជាមុន");
  const headers = { "content-type": "application/json" };
  if (authenticated) {
    const user = auth.currentUser;
    if (!user) throw new Error("សូម Login ម្តងទៀត");
    headers.authorization = `Bearer ${await user.getIdToken()}`;
  }
  const response = await fetch(`${workerUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body || {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    const error = new Error(result.error || `Worker error (${response.status})`);
    error.code = result.code || "worker/request-failed";
    throw error;
  }
  return result;
}

export function resolveVerifiedLogin(identifier, password) {
  return workerRequest("/api/auth/resolve-login", { identifier, password }, false);
}

export function requestSecurePasswordReset(identifier) {
  return workerRequest("/api/auth/password-reset", { identifier }, false);
}

