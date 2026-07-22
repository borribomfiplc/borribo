const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_TELEGRAM_SETTINGS = {
  enabled: false,
  chatId: "",
  onCheckIn: true,
  onCheckOut: true,
  onLeaveRequest: true,
  onLeaveDecision: true,
  onLate: true,
  dailySummary: true,
  summaryTime: "17:30",
};

let accessTokenCache = null;

function json(data, status = 200, origin = "") {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    vary: "Origin",
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

function preflight(origin) {
  const headers = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  return new Response(null, { status: 204, headers });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return "";
  let host;
  try { host = new URL(origin).hostname; } catch { return ""; }
  const configured = String(env.ALLOWED_ORIGINS || "https://borribo.pages.dev")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (configured.includes(origin) || host === "localhost" || host === "127.0.0.1" || host.endsWith(".pages.dev")) return origin;
  return "";
}

function base64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeJwtPayload(token) {
  try {
    const value = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(value.padEnd(Math.ceil(value.length / 4) * 4, "=")));
  } catch { return {}; }
}

function pemToArrayBuffer(pem) {
  const normalized = String(pem || "").replace(/\\n/g, "\n");
  const base64 = normalized.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getGoogleAccessToken(env) {
  if (accessTokenCache?.expiresAt > Date.now() + 60_000) return accessTokenCache.token;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) throw new Error("Firebase service-account secrets are missing");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: FIRESTORE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(env.FIREBASE_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(`Google OAuth failed: ${result.error_description || response.status}`);
  accessTokenCache = { token: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return accessTokenCache.token;
}

function firestoreBase(env) {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is missing");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents`;
}

function decodeValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  return null;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}

function encodeFields(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]));
}

async function firestoreRequest(env, path, options = {}) {
  const token = await getGoogleAccessToken(env);
  const response = await fetch(`${firestoreBase(env)}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) },
  });
  if (response.status === 404) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firestore request failed (${response.status}): ${result?.error?.message || "unknown error"}`);
  return result;
}

async function getDocument(env, path) {
  const result = await firestoreRequest(env, `/${path}`);
  return result ? { id: result.name.split("/").pop(), ...decodeFields(result.fields) } : null;
}

async function putDocument(env, path, data) {
  return firestoreRequest(env, `/${path}`, { method: "PATCH", body: JSON.stringify({ fields: encodeFields(data) }) });
}

async function listDocuments(env, collectionId, pageSize = 500) {
  const result = await firestoreRequest(env, `/${collectionId}?pageSize=${pageSize}`);
  return (result?.documents || []).map((doc) => ({ id: doc.name.split("/").pop(), ...decodeFields(doc.fields) }));
}

async function queryDocuments(env, collectionId, field, value) {
  const result = await firestoreRequest(env, ":runQuery", {
    method: "POST",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: encodeValue(value) } },
      limit: 500,
    } }),
  });
  return (result || []).filter((item) => item.document).map((item) => ({
    id: item.document.name.split("/").pop(), ...decodeFields(item.document.fields),
  }));
}

async function verifyFirebaseUser(request, env) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw Object.assign(new Error("Firebase login is required"), { status: 401 });
  if (!env.FIREBASE_WEB_API_KEY) throw new Error("FIREBASE_WEB_API_KEY is missing");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken: token }),
  });
  const result = await response.json();
  if (!response.ok || !result.users?.[0]) throw Object.assign(new Error("Firebase session is invalid or expired"), { status: 401 });
  let custom = {};
  try { custom = JSON.parse(result.users[0].customAttributes || "{}"); } catch { custom = {}; }
  const payload = decodeJwtPayload(token);
  return {
    uid: result.users[0].localId,
    email: result.users[0].email || "",
    role: custom.role || payload.role || "",
    employeeId: custom.employeeId || payload.employeeId || "",
  };
}

function manager(user) { return user.role === "admin" || user.role === "hr"; }

function escapeHtml(value) {
  return String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTelegram(env, chatId, text) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN secret is missing");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram failed: ${result.description || response.status}`);
  return result.result;
}

async function hashKey(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function eventConfig(type) {
  return {
    check_in: { collection: "attendanceToday", option: "onCheckIn" },
    check_out: { collection: "attendanceToday", option: "onCheckOut" },
    leave_request: { collection: "leaveRequests", option: "onLeaveRequest" },
    leave_decision: { collection: "leaveRequests", option: "onLeaveDecision" },
  }[type];
}

function eventMessage(type, row) {
  if (type === "check_in") {
    const late = Number(row.lateMinutes || 0);
    return `${late > 0 ? "🟠" : "🟢"} <b>Check-in</b>\n👤 ${escapeHtml(row.name)} (${escapeHtml(row.id)})\n🏢 ${escapeHtml(row.branch)}\n🕒 ${escapeHtml(row.checkIn)}${late > 0 ? `\n⏰ មកយឺត ${late} នាទី` : ""}`;
  }
  if (type === "check_out") {
    return `🔵 <b>Check-out</b>\n👤 ${escapeHtml(row.name)} (${escapeHtml(row.id)})\n🏢 ${escapeHtml(row.branch)}\n🕒 ${escapeHtml(row.checkOut)}\n⏱ ${escapeHtml(row.hours || "—")}`;
  }
  if (type === "leave_request") {
    return `📝 <b>សំណើសុំច្បាប់ថ្មី</b>\n👤 ${escapeHtml(row.name)} (${escapeHtml(row.employeeId || row.empId)})\n🏢 ${escapeHtml(row.branch)}\n📅 ${escapeHtml(row.startDate)} — ${escapeHtml(row.endDate)} (${escapeHtml(row.days)} ថ្ងៃ)\n📌 ${escapeHtml(row.leaveType)}\n💬 ${escapeHtml(row.reason)}`;
  }
  const approved = row.status === "បានអនុម័ត";
  return `${approved ? "✅" : "❌"} <b>${escapeHtml(row.status)}</b>\n👤 ${escapeHtml(row.name)} (${escapeHtml(row.employeeId || row.empId)})\n📅 ${escapeHtml(row.startDate)} — ${escapeHtml(row.endDate)} (${escapeHtml(row.days)} ថ្ងៃ)\n📌 ${escapeHtml(row.leaveType)}`;
}

async function loadTelegramSettings(env) {
  return { ...DEFAULT_TELEGRAM_SETTINGS, ...(await getDocument(env, "settings/telegram") || {}) };
}

async function logTelegramEvent(env, id, data) {
  await putDocument(env, `telegramOutbox/${id}`, { id, ...data, createdAt: new Date().toISOString() });
}

async function handleTest(user, env) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const settings = await loadTelegramSettings(env);
  if (!settings.chatId) throw Object.assign(new Error("Telegram Chat ID is not configured"), { status: 400 });
  const message = `✅ <b>Borribo HRMS</b>\nTelegram Bot ភ្ជាប់បានជោគជ័យ\nផ្ញើដោយ: ${escapeHtml(user.email)}`;
  const sent = await sendTelegram(env, settings.chatId, message);
  const id = `TG-${Date.now()}`;
  await logTelegramEvent(env, id, { chatId: settings.chatId, type: "test", message: message.replace(/<[^>]+>/g, ""), status: "បានផ្ញើ", telegramMessageId: sent.message_id, actorUid: user.uid });
  return { ok: true, messageId: sent.message_id };
}

async function handleEvent(user, env, body) {
  const config = eventConfig(body.type);
  if (!config || !body.recordId) throw Object.assign(new Error("Invalid Telegram event"), { status: 400 });
  if (body.type === "leave_decision" && !manager(user)) throw Object.assign(new Error("Only Admin/HR can send leave decisions"), { status: 403 });
  const row = await getDocument(env, `${config.collection}/${body.recordId}`);
  if (!row) throw Object.assign(new Error("Event record was not found"), { status: 404 });
  const ownerUid = row.uid || row.employeeUid || "";
  if (!manager(user) && user.role !== "kiosk" && ownerUid !== user.uid) throw Object.assign(new Error("You cannot notify for another employee"), { status: 403 });
  const settings = await loadTelegramSettings(env);
  if (!settings.enabled || !settings.chatId) return { ok: true, skipped: true, reason: "disabled" };
  const lateCheckIn = body.type === "check_in" && Number(row.lateMinutes || 0) > 0;
  const eventEnabled = lateCheckIn
    ? Boolean(settings.onCheckIn || settings.onLate)
    : Boolean(settings[config.option]);
  if (!eventEnabled) return { ok: true, skipped: true, reason: "event-disabled" };
  const state = body.type === "leave_decision" ? row.status : body.type === "check_out" ? row.checkOut : body.type === "check_in" ? row.checkIn : row.requestedOn || row.startDate;
  const id = await hashKey(`${body.type}:${body.recordId}:${state}`);
  if (await getDocument(env, `telegramEvents/${id}`)) return { ok: true, skipped: true, reason: "duplicate" };
  const text = eventMessage(body.type, row);
  try {
    const sent = await sendTelegram(env, settings.chatId, text);
    await putDocument(env, `telegramEvents/${id}`, { id, type: body.type, recordId: body.recordId, status: "sent", sentAt: new Date().toISOString(), telegramMessageId: sent.message_id });
    await logTelegramEvent(env, id, { chatId: settings.chatId, type: body.type, message: text.replace(/<[^>]+>/g, ""), status: "បានផ្ញើ", telegramMessageId: sent.message_id, actorUid: user.uid, recordId: body.recordId });
    return { ok: true, messageId: sent.message_id };
  } catch (error) {
    await logTelegramEvent(env, id, { chatId: settings.chatId, type: body.type, message: text.replace(/<[^>]+>/g, ""), status: "ផ្ញើបរាជ័យ", error: error.message, actorUid: user.uid, recordId: body.recordId });
    throw error;
  }
}

function cambodiaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

async function sendDailySummary(env, force = false) {
  const settings = await loadTelegramSettings(env);
  if (!settings.enabled || !settings.chatId || (!settings.dailySummary && !force)) return { ok: true, skipped: true, reason: "disabled" };
  const parts = cambodiaParts();
  const dateISO = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}`;
  if (!force && time !== settings.summaryTime) return { ok: true, skipped: true, reason: "not-time" };
  const id = await hashKey(`daily-summary:${dateISO}`);
  if (await getDocument(env, `telegramEvents/${id}`)) return { ok: true, skipped: true, reason: "duplicate" };
  const [employees, attendance, approvedLeaves] = await Promise.all([
    listDocuments(env, "employees"), queryDocuments(env, "attendanceToday", "dateISO", dateISO), queryDocuments(env, "leaveRequests", "status", "បានអនុម័ត"),
  ]);
  const presentIds = new Set(attendance.filter((row) => row.checkIn && row.checkIn !== "—").map((row) => row.id));
  const onLeaveIds = new Set(approvedLeaves.filter((row) => row.startDate <= dateISO && row.endDate >= dateISO).map((row) => row.employeeId || row.empId));
  const late = attendance.filter((row) => Number(row.lateMinutes || 0) > 0 || row.status === "យឺត").length;
  const present = presentIds.size;
  const absent = employees.filter((row) => !presentIds.has(row.id) && !onLeaveIds.has(row.id)).length;
  const message = `📊 <b>របាយការណ៍វត្តមានប្រចាំថ្ងៃ</b>\n📅 ${dateISO}\n\n👥 បុគ្គលិកសរុប: ${employees.length}\n🟢 មានវត្តមាន: ${present}\n🟠 មកយឺត: ${late}\n🏖 សុំច្បាប់: ${onLeaveIds.size}\n🔴 អវត្តមាន: ${absent}`;
  const sent = await sendTelegram(env, settings.chatId, message);
  await putDocument(env, `telegramEvents/${id}`, { id, type: "daily_summary", dateISO, status: "sent", sentAt: new Date().toISOString(), telegramMessageId: sent.message_id });
  await logTelegramEvent(env, id, { chatId: settings.chatId, type: "daily_summary", message: message.replace(/<[^>]+>/g, ""), status: "បានផ្ញើ", telegramMessageId: sent.message_id });
  return { ok: true, messageId: sent.message_id };
}

async function handleRequest(request, env) {
  const origin = allowedOrigin(request, env);
  if (request.method === "OPTIONS") return origin ? preflight(origin) : json({ error: "Origin not allowed" }, 403);
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ ok: true, configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_WEB_API_KEY) }, 200, origin);
  }
  try {
    const user = await verifyFirebaseUser(request, env);
    let result;
    if (url.pathname === "/api/telegram/test" && request.method === "POST") result = await handleTest(user, env);
    else if (url.pathname === "/api/telegram/event" && request.method === "POST") result = await handleEvent(user, env, await request.json());
    else if (url.pathname === "/api/telegram/daily-summary" && request.method === "POST") {
      if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
      result = await sendDailySummary(env, true);
    } else return json({ error: "Not found" }, 404, origin);
    return json(result, 200, origin);
  } catch (error) {
    console.error("Telegram worker request failed", error.message);
    return json({ ok: false, error: error.message || "Request failed" }, error.status || 500, origin);
  }
}

export default {
  fetch: handleRequest,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDailySummary(env).catch((error) => console.error("Daily Telegram summary failed", error.message)));
  },
};

export { decodeFields, encodeFields, eventMessage };
