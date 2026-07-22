import { auth } from "../firebase/config";

const workerUrl = String(import.meta.env.VITE_TELEGRAM_WORKER_URL || "").replace(/\/$/, "");

export function isTelegramWorkerConfigured() {
  return Boolean(workerUrl);
}

async function telegramRequest(path, body) {
  if (!workerUrl) throw new Error("សូមកំណត់ VITE_TELEGRAM_WORKER_URL ក្នុង Cloudflare Pages ជាមុន");
  const user = auth.currentUser;
  if (!user) throw new Error("សូម Login ម្តងទៀត");
  const token = await user.getIdToken();
  const response = await fetch(`${workerUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Telegram Worker error (${response.status})`);
  return result;
}

export function testTelegramConnection() {
  return telegramRequest("/api/telegram/test");
}

export function sendDailyTelegramSummary() {
  return telegramRequest("/api/telegram/daily-summary");
}

export async function notifyTelegram(type, recordId) {
  if (!workerUrl || !recordId) return { ok: true, skipped: true, reason: "not-configured" };
  try {
    return await telegramRequest("/api/telegram/event", { type, recordId });
  } catch (error) {
    // The HRMS save already succeeded. A Telegram outage must not roll back
    // attendance or leave data, but it remains visible in the browser console
    // and in the Telegram queue when the Worker reached Firestore.
    console.error("[telegram] Notification failed:", error);
    return { ok: false, error: error.message };
  }
}
