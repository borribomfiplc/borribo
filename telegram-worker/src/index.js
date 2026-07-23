const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
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
const DEFAULT_SYSTEM_SETTINGS = {
  emailNotif: true,
  pushNotif: true,
  autoLock: true,
  autoBackup: true,
  darkMode: false,
  sessionTimeoutMinutes: 30,
  backupFreq: "daily",
  lastBackupAt: "",
  lastBackupCompletedAt: "",
  lastBackupStatus: "never",
  lastBackupError: "",
  lastBackupOperation: "",
};

const BACKUP_FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
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
  const configuredHosts = configured.map((value) => {
    try { return new URL(value).hostname; } catch { return ""; }
  }).filter(Boolean);
  const projectPreview = configuredHosts.some((value) => value.endsWith(".pages.dev") && host.endsWith(`.${value}`));
  if (configured.includes(origin) || host === "localhost" || host === "127.0.0.1" || projectPreview) return origin;
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

async function getDocumentWithMetadata(env, path) {
  const result = await firestoreRequest(env, `/${path}`);
  return result ? {
    id: result.name.split("/").pop(),
    ...decodeFields(result.fields),
    __updateTime: result.updateTime || "",
  } : null;
}

async function putDocument(env, path, data) {
  return firestoreRequest(env, `/${path}`, { method: "PATCH", body: JSON.stringify({ fields: encodeFields(data) }) });
}

async function deleteDocument(env, path) {
  return firestoreRequest(env, `/${path}`, { method: "DELETE" });
}

function documentName(env, path) {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is missing");
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

async function commitWrites(env, writes) {
  if (!writes.length) return null;
  return firestoreRequest(env, ":commit", {
    method: "POST",
    body: JSON.stringify({ writes: writes.map((write) => {
      if (write.delete) return { delete: documentName(env, write.delete) };
      return {
        update: { name: documentName(env, write.path), fields: encodeFields(write.data) },
        ...(write.updateTime
          ? { currentDocument: { updateTime: write.updateTime } }
          : write.exists === undefined
            ? {}
            : { currentDocument: { exists: write.exists } }),
      };
    }) }),
  });
}

async function listDocuments(env, collectionId, pageSize = 500) {
  const documents = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) query.set("pageToken", pageToken);
    const result = await firestoreRequest(env, `/${collectionId}?${query}`);
    documents.push(...(result?.documents || []).map((item) => ({ id: item.name.split("/").pop(), ...decodeFields(item.fields) })));
    pageToken = result?.nextPageToken || "";
  } while (pageToken);
  return documents;
}

async function queryDocuments(env, collectionId, field, value) {
  const result = await firestoreRequest(env, ":runQuery", {
    method: "POST",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: encodeValue(value) } },
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
  if (result.users[0].disabled) throw Object.assign(new Error("This Login Account is disabled"), { status: 403 });
  const profile = await getDocument(env, `profiles/${result.users[0].localId}`);
  if (profile?.active === false) throw Object.assign(new Error("This Login Account is disabled"), { status: 403 });
  let custom = {};
  try { custom = JSON.parse(result.users[0].customAttributes || "{}"); } catch { custom = {}; }
  const payload = decodeJwtPayload(token);
  return {
    uid: result.users[0].localId,
    email: result.users[0].email || "",
    role: custom.role || payload.role || profile?.role || "",
    employeeId: custom.employeeId || payload.employeeId || profile?.employeeId || "",
    branch: custom.branch || payload.branch || profile?.branch || "",
    branchId: custom.branchId || payload.branchId || profile?.branchId || "",
  };
}

function manager(user) { return user.role === "admin" || user.role === "hr"; }

async function authAdminRequest(env, action, body) {
  const token = await getGoogleAccessToken(env);
  const url = action === "create"
    ? `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`
    : `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:${action}`;
  const payload = action === "create" ? { ...body, targetProjectId: env.FIREBASE_PROJECT_ID } : body;
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || `Firebase Auth request failed (${response.status})`);
  return result;
}

async function listAuthAccounts(env) {
  const token = await getGoogleAccessToken(env);
  const accounts = [];
  let nextPageToken = "";
  do {
    const query = new URLSearchParams({ maxResults: "1000" });
    if (nextPageToken) query.set("nextPageToken", nextPageToken);
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:batchGet?${query}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || `Firebase Auth list failed (${response.status})`);
    accounts.push(...(result.users || []));
    nextPageToken = result.nextPageToken || "";
  } while (nextPageToken);
  return accounts;
}

function validUsername(value) { return /^[a-z0-9][a-z0-9._-]{1,31}$/.test(value); }

function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function normalizePhone(value) { return String(value || "").replace(/[^0-9+]/g, ""); }
function normalizeDecisionNo(value) { return String(value || "").trim().toUpperCase().replace(/\s+/g, " "); }
function uniquePath(kind, value) { return `employeeUnique/${kind}_${base64Url(new TextEncoder().encode(value))}`; }

const EMPLOYEE_STATUS_ALIASES = new Map([
  ["សកម្ម", "សកម្ម"],
  ["ឈប់សម្រាក", "ឈប់សម្រាក"],
  ["អសកម្ម", "អសកម្ម"],
  // A short-lived v49 Worker deployment saved these mojibake values.
  ["ážŸáž€áž˜áŸ’áž˜", "សកម្ម"],
  ["ážˆáž”áŸ‹ážŸáž˜áŸ’ážšáž¶áž€", "ឈប់សម្រាក"],
  ["áž¢ážŸáž€áž˜áŸ’áž˜", "អសកម្ម"],
]);

function normalizeEmployeeStatus(value, fallback = "") {
  const status = String(value || "").trim();
  return EMPLOYEE_STATUS_ALIASES.get(status) || fallback;
}

function requireEmployeeStatus(value, fallback = "") {
  const status = normalizeEmployeeStatus(value, fallback);
  if (!status) throw Object.assign(new Error("Invalid employee status"), { status: 400 });
  return status;
}

function accountStatusForEmployee(employee = {}) {
  const stored = String(employee.accountStatus || "").trim().toLowerCase();
  if (["none", "active", "disabled", "deleted"].includes(stored)) return stored;
  if (employee.uid) return normalizeEmployeeStatus(employee.status) === "អសកម្ម" ? "disabled" : "active";
  return employee.loginDeletedAt ? "deleted" : "none";
}

const LOGIN_ROLES = new Set(["admin", "hr", "employee", "kiosk"]);

function customClaims(account = {}) {
  try { return JSON.parse(account.customAttributes || "{}"); } catch { return {}; }
}

function accountAuditRow(account, context) {
  const uid = String(account.localId || "");
  const email = normalizeEmail(account.email);
  const profile = context.profiles.get(uid) || null;
  const userDocument = context.users.get(uid) || null;
  const linkedEmployees = context.employeesByUid.get(uid) || [];
  const claims = customClaims(account);
  const claimRole = String(claims.role || "");
  const profileRole = String(profile?.role || "");
  const role = claimRole || profileRole || String(userDocument?.role || "");
  const employeeId = String(
    claims.employeeId || profile?.employeeId || userDocument?.employeeId || linkedEmployees[0]?.id || "",
  );
  const employee = (employeeId && context.employees.get(employeeId)) || linkedEmployees[0] || null;
  const username = String(profile?.username || userDocument?.username || employee?.username || "").trim().toLowerCase();
  const usernameDocument = username ? context.usernames.get(username) : null;
  const resetDocument = email ? context.passwordResetEmails.get(email) : null;
  const blockers = [];
  const warnings = [];

  if (!email) blockers.push("missing-email");
  if (account.disabled === true) blockers.push("auth-disabled");
  if (!profile) blockers.push("missing-profile");
  else if (profile.active === false) blockers.push("profile-inactive");
  if (!LOGIN_ROLES.has(role)) blockers.push("invalid-role");
  if (claimRole && profileRole && claimRole !== profileRole) blockers.push("role-mismatch");
  else if (LOGIN_ROLES.has(role) && claimRole !== role) blockers.push("missing-role-claim");

  if (role === "employee") {
    if (!employeeId) blockers.push("missing-employee-id");
    else if (!employee) blockers.push("missing-employee");
    else {
      if (String(employee.uid || "") !== uid) blockers.push("employee-link-mismatch");
      if (normalizeEmployeeStatus(employee.status) === "អសកម្ម") blockers.push("employee-inactive");
    }
  }

  if (!userDocument) warnings.push("missing-user-directory");
  if (!username) warnings.push("missing-username");
  else if (!usernameDocument || usernameDocument.uid !== uid || usernameDocument.active === false) {
    warnings.push("username-directory-mismatch");
  }
  if (!resetDocument || resetDocument.uid !== uid || resetDocument.active === false) {
    warnings.push("password-reset-directory-mismatch");
  }

  return {
    uid,
    email,
    name: account.displayName || profile?.name || userDocument?.name || employee?.name || email || uid,
    username,
    role,
    employeeId,
    branch: profile?.branch || userDocument?.branch || employee?.branch || "",
    disabled: account.disabled === true,
    active: account.disabled !== true && profile?.active !== false,
    ready: blockers.length === 0,
    blockers,
    warnings,
    createdAt: account.createdAt ? new Date(Number(account.createdAt)).toISOString() : "",
    lastLoginAt: account.lastLoginAt ? new Date(Number(account.lastLoginAt)).toISOString() : "",
  };
}

async function buildLoginAccountAudit(env) {
  const [authAccounts, profiles, users, employees, usernames, passwordResetEmails] = await Promise.all([
    listAuthAccounts(env),
    listDocuments(env, "profiles"),
    listDocuments(env, "users"),
    listDocuments(env, "employees"),
    listDocuments(env, "usernames"),
    listDocuments(env, "passwordResetEmails"),
  ]);
  const employeesByUid = new Map();
  for (const employee of employees) {
    const uid = String(employee.uid || "");
    if (!uid) continue;
    employeesByUid.set(uid, [...(employeesByUid.get(uid) || []), employee]);
  }
  const context = {
    profiles: new Map(profiles.map((row) => [row.id, row])),
    users: new Map(users.map((row) => [row.id, row])),
    employees: new Map(employees.map((row) => [row.id, row])),
    employeesByUid,
    usernames: new Map(usernames.map((row) => [row.id, row])),
    passwordResetEmails: new Map(passwordResetEmails.map((row) => [normalizeEmail(row.id), row])),
  };
  const rows = authAccounts.map((account) => accountAuditRow(account, context));
  const authUids = new Set(authAccounts.map((account) => String(account.localId || "")));
  for (const profile of profiles) {
    if (authUids.has(profile.id)) continue;
    rows.push({
      uid: profile.id,
      email: normalizeEmail(profile.email),
      name: profile.name || profile.email || profile.id,
      username: profile.username || "",
      role: profile.role || "",
      employeeId: profile.employeeId || "",
      branch: profile.branch || "",
      disabled: true,
      active: false,
      ready: false,
      blockers: ["missing-auth-account"],
      warnings: [],
      createdAt: "",
      lastLoginAt: "",
    });
  }
  rows.sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
  return {
    rows,
    summary: {
      total: rows.length,
      ready: rows.filter((row) => row.ready).length,
      blocked: rows.filter((row) => !row.ready).length,
      warnings: rows.filter((row) => row.warnings.length > 0).length,
    },
    raw: { authAccounts, context },
  };
}

async function repairLoginAccountDirectories(user, env, audit) {
  let repaired = 0;
  const { authAccounts, context } = audit.raw;
  const auditRows = new Map(audit.rows.map((row) => [row.uid, row]));
  for (const account of authAccounts) {
    const uid = String(account.localId || "");
    const email = normalizeEmail(account.email);
    if (!uid || !email) continue;
    const currentAudit = auditRows.get(uid);
    if (currentAudit?.ready && !currentAudit.warnings.length) continue;
    const claims = customClaims(account);
    const profile = context.profiles.get(uid) || null;
    const userDocument = context.users.get(uid) || null;
    const linkedEmployees = context.employeesByUid.get(uid) || [];
    const claimRole = LOGIN_ROLES.has(claims.role) ? claims.role : "";
    const profileRole = LOGIN_ROLES.has(profile?.role) ? profile.role : "";
    if (claimRole && profileRole && claimRole !== profileRole) continue;
    const role = claimRole || profileRole || (LOGIN_ROLES.has(userDocument?.role) ? userDocument.role : "");
    if (!role) continue;

    const employeeId = String(
      claims.employeeId || profile?.employeeId || userDocument?.employeeId || linkedEmployees[0]?.id || "",
    );
    const employee = (employeeId && context.employees.get(employeeId)) || linkedEmployees[0] || null;
    if (role === "employee" && (!employeeId || !employee)) continue;
    const branch = String(claims.branch || profile?.branch || userDocument?.branch || employee?.branch || "");
    const branchId = String(claims.branchId || profile?.branchId || userDocument?.branchId || employee?.branchId || "");
    let username = String(profile?.username || userDocument?.username || employee?.username || "").trim().toLowerCase();
    if (!validUsername(username)) {
      const emailUsername = email.split("@")[0].toLowerCase();
      username = validUsername(emailUsername) ? emailUsername : "";
    }
    const usernameOwner = username ? context.usernames.get(username) : null;
    if (usernameOwner && usernameOwner.uid && usernameOwner.uid !== uid) username = "";
    const active = account.disabled !== true && profile?.active !== false
      && (!employee || normalizeEmployeeStatus(employee.status) !== "អសកម្ម");
    const name = account.displayName || profile?.name || userDocument?.name || employee?.name || email;
    const now = new Date().toISOString();

    const nextClaims = { ...claims, role, employeeId: employeeId || null, branch, branchId: branchId || null };
    if (JSON.stringify(nextClaims) !== JSON.stringify(claims)) {
      await authAdminRequest(env, "update", {
        localId: uid,
        customAttributes: JSON.stringify(nextClaims),
        disableUser: account.disabled === true,
      });
    }

    const writes = [
      {
        path: `profiles/${uid}`,
        data: {
          ...(profile || {}),
          uid, email, username, name, role, employeeId: employeeId || null,
          branch, branchId: branchId || null, active, updatedAt: now,
        },
      },
      {
        path: `users/${uid}`,
        data: {
          ...(userDocument || {}),
          id: uid, email, username, name, role, employeeId: employeeId || null,
          branch, branchId: branchId || null, status: active ? "សកម្ម" : "អសកម្ម",
          active, updatedAt: now,
        },
      },
      { path: `passwordResetEmails/${email}`, data: { email, uid, active, updatedAt: now } },
      ...(username ? [{ path: `usernames/${username}`, data: { username, email, uid, active, updatedAt: now } }] : []),
      ...(employee ? [{
        path: `employees/${employee.id}`,
        data: {
          ...employee, uid, email, username, accountRole: role,
          accountStatus: active ? "active" : "disabled", updatedAt: now,
        },
      }] : []),
      auditLogWrite("login_account_repaired", user, {
        id: employee?.id || employeeId,
        name,
        uid,
        email,
        accountRole: role,
      }),
    ];
    await commitWrites(env, writes);
    repaired += 1;
  }
  return repaired;
}

async function handleAuditLoginAccounts(user, env, body) {
  if (user.role !== "admin") throw Object.assign(new Error("Admin role is required"), { status: 403 });
  let audit = await buildLoginAccountAudit(env);
  let repaired = 0;
  if (body?.repair === true) {
    repaired = await repairLoginAccountDirectories(user, env, audit);
    audit = await buildLoginAccountAudit(env);
  }
  return { ok: true, ...audit, raw: undefined, repaired };
}

function auditLogWrite(type, user, employee, extra = {}) {
  const id = `AUD-${String(type).toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    path: `auditLogs/${id}`,
    data: {
      id,
      type,
      employeeId: employee.id || "",
      employeeName: employee.name || "",
      targetUid: employee.uid || "",
      targetEmail: employee.email || "",
      targetRole: employee.accountRole || "",
      actorUid: user.uid || "",
      actorEmail: user.email || "System",
      createdAt: new Date().toISOString(),
      ...extra,
    },
    exists: false,
  };
}

function employmentPeriods(employee = {}) {
  if (Array.isArray(employee.employmentPeriods) && employee.employmentPeriods.length) {
    return employee.employmentPeriods.map((period) => ({
      startDate: String(period?.startDate || ""),
      endDate: String(period?.endDate || ""),
    }));
  }
  if (!employee.startDate) return [];
  return [{
    startDate: String(employee.startDate),
    endDate: String(employee.endDate || ""),
  }];
}

function closeEmploymentPeriod(employee, endDate) {
  const periods = employmentPeriods(employee);
  if (!periods.length) return periods;
  const last = periods.length - 1;
  if (!periods[last].endDate) periods[last] = { ...periods[last], endDate };
  return periods;
}

function appendEmploymentPeriod(employee, startDate) {
  const periods = employmentPeriods(employee);
  if (periods.some((period) => !period.endDate)) {
    throw Object.assign(new Error("Employee already has an open employment period"), { status: 409 });
  }
  periods.push({ startDate, endDate: "" });
  return periods;
}

async function assertEmployeeUnique(env, employee, excludeId = "") {
  const email = normalizeEmail(employee.email);
  const phone = normalizePhone(employee.phone);
  const allEmployees = await listDocuments(env, "employees");
  if (email && allEmployees.some((row) => row.id !== excludeId && normalizeEmail(row.email) === email)) throw Object.assign(new Error("EMAIL_EXISTS"), { status: 409 });
  if (phone && allEmployees.some((row) => row.id !== excludeId && normalizePhone(row.phone) === phone)) throw Object.assign(new Error("PHONE_EXISTS"), { status: 409 });
  for (const [field, value, label] of [["email", email, "EMAIL_EXISTS"], ["phoneNormalized", phone, "PHONE_EXISTS"]]) {
    if (!value) continue;
    const reservation = await getDocument(env, uniquePath(field, value));
    if (reservation && reservation.employeeId !== excludeId) throw Object.assign(new Error(label), { status: 409 });
  }
  return { email, phone };
}

async function uniqueReservationWrites(env, nextEmployee, previousEmployee = null) {
  const writes = [];
  const next = { email: normalizeEmail(nextEmployee.email), phoneNormalized: normalizePhone(nextEmployee.phone) };
  const previous = previousEmployee ? { email: normalizeEmail(previousEmployee.email), phoneNormalized: normalizePhone(previousEmployee.phone) } : {};
  for (const field of ["email", "phoneNormalized"]) {
    if (previous[field] && previous[field] !== next[field]) {
      const oldPath = uniquePath(field, previous[field]);
      const oldRecord = await getDocument(env, oldPath);
      if (oldRecord?.employeeId === nextEmployee.id) writes.push({ delete: oldPath });
    }
    if (next[field]) {
      const path = uniquePath(field, next[field]);
      const current = await getDocument(env, path);
      writes.push({ path, data: { employeeId: nextEmployee.id, field, value: next[field], updatedAt: new Date().toISOString() }, ...(current ? {} : { exists: false }) });
    }
  }
  return writes;
}

async function handleCreateEmployee(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const employee = body?.employee || {};
  const account = body?.account || {};
  const accountEnabled = account.enabled === true;
  const username = String(account.username || "").trim().toLowerCase();
  const email = normalizeEmail(account.email || employee.email);
  const role = String(account.role || "employee");
  if (!employee.id || !employee.name || !employee.englishName || !employee.branch || !employee.dept || !employee.role) throw Object.assign(new Error("Employee data is incomplete"), { status: 400 });
  employee.englishName = String(employee.englishName).trim().replace(/\s+/g, " ").toUpperCase();
  if (!/^[A-Z][A-Z .'-]*$/.test(employee.englishName)) throw Object.assign(new Error("Invalid English employee name"), { status: 400 });
  if (await getDocument(env, `employees/${employee.id}`)) throw Object.assign(new Error("EMPLOYEE_ID_EXISTS"), { status: 409 });
  if (accountEnabled) {
    if (user.role !== "admin") throw Object.assign(new Error("Only Admin can create Login Accounts"), { status: 403 });
    if (!validUsername(username)) throw Object.assign(new Error("Invalid username"), { status: 400 });
    if (!email.endsWith("@borribo.com.kh")) throw Object.assign(new Error("Account email must use @borribo.com.kh"), { status: 400 });
    if (String(account.password || "").length < 8) throw Object.assign(new Error("Temporary password must have at least 8 characters"), { status: 400 });
    if (!["employee", "hr", "admin"].includes(role)) throw Object.assign(new Error("Invalid role"), { status: 400 });
    if (user.role !== "admin" && role !== "employee") throw Object.assign(new Error("Only Admin can create HR or Admin accounts"), { status: 403 });
    if (await getDocument(env, `usernames/${username}`)) throw Object.assign(new Error("USERNAME_EXISTS"), { status: 409 });
  }

  const unique = await assertEmployeeUnique(env, { ...employee, email }, "");
  const now = new Date().toISOString();
  const baseEmployee = {
    ...employee,
    email: unique.email,
    phoneNormalized: unique.phone,
    status: requireEmployeeStatus(employee.status, "សកម្ម"),
    accountStatus: accountEnabled ? "active" : "none",
    employmentPeriods: employmentPeriods(employee),
    updatedAt: now,
  };
  const reservationWrites = await uniqueReservationWrites(env, baseEmployee);

  if (!accountEnabled) {
    await commitWrites(env, [{ path: `employees/${employee.id}`, data: baseEmployee, exists: false }, ...reservationWrites]);
    return { ok: true, employee: baseEmployee };
  }

  let uid = "";
  try {
    const created = await authAdminRequest(env, "create", { email, password: account.password, displayName: employee.name, emailVerified: false, disabled: false });
    uid = created.localId;
    await authAdminRequest(env, "update", { localId: uid, displayName: employee.name, customAttributes: JSON.stringify({ role, employeeId: employee.id, branch: employee.branch, branchId: employee.branchId || "" }), disableUser: false });
    const employeeRecord = {
      ...baseEmployee,
      uid,
      email,
      username,
      accountRole: role,
      accountStatus: "active",
      loginCreatedAt: now,
      loginCreatedByUid: user.uid,
      loginCreatedByEmail: user.email,
    };
    await commitWrites(env, [
      { path: `employees/${employee.id}`, data: employeeRecord, exists: false },
      { path: `profiles/${uid}`, data: { uid, employeeId: employee.id, name: employee.name, englishName: employee.englishName, email, username, role, branch: employee.branch, branchId: employee.branchId || "", active: true, createdAt: now, updatedAt: now }, exists: false },
      { path: `usernames/${username}`, data: { username, email, uid, active: true }, exists: false },
      { path: `passwordResetEmails/${email}`, data: { email, uid, active: true } },
      { path: `users/${uid}`, data: { id: uid, employeeId: employee.id, name: employee.name, englishName: employee.englishName, email, username, role, branch: employee.branch, branchId: employee.branchId || "", status: "សកម្ម", active: true, createdAt: now }, exists: false },
      auditLogWrite("login_account_created", user, employeeRecord),
      ...reservationWrites,
    ]);
    return { ok: true, employee: employeeRecord, uid };
  } catch (error) {
    if (uid) {
      const committed = await getDocument(env, `employees/${employee.id}`).catch(() => null);
      if (committed?.uid === uid) return { ok: true, employee: committed, uid, recovered: true };
      await authAdminRequest(env, "delete", { localId: uid }).catch(() => {});
    }
    throw error;
  }
}

async function handleProvisionEmployeeAccount(user, env, body) {
  if (user.role !== "admin") throw Object.assign(new Error("Admin role is required to create Login Accounts"), { status: 403 });
  const employeeId = String(body?.employeeId || "").trim();
  const account = body?.account || {};
  const employee = await getDocument(env, `employees/${employeeId}`);
  if (!employee) throw Object.assign(new Error("Employee record was not found"), { status: 404 });
  if (employee.uid) throw Object.assign(new Error("បុគ្គលិកនេះមាន Login Account រួចហើយ"), { status: 409 });
  if (normalizeEmployeeStatus(employee.status) === "អសកម្ម") throw Object.assign(new Error("មិនអាចបង្កើត Account សម្រាប់បុគ្គលិកអសកម្មបានទេ"), { status: 400 });
  const username = String(account.username || "").trim().toLowerCase();
  const email = normalizeEmail(account.email || `${username}@borribo.com.kh`);
  const role = String(account.role || "employee");
  if (!validUsername(username)) throw Object.assign(new Error("Invalid username"), { status: 400 });
  if (!email.endsWith("@borribo.com.kh")) throw Object.assign(new Error("Account email must use @borribo.com.kh"), { status: 400 });
  if (String(account.password || "").length < 8) throw Object.assign(new Error("Temporary password must have at least 8 characters"), { status: 400 });
  if (!["employee", "hr", "admin"].includes(role)) throw Object.assign(new Error("Invalid role"), { status: 400 });
  if (user.role !== "admin" && role !== "employee") throw Object.assign(new Error("Only Admin can create HR or Admin accounts"), { status: 403 });
  if (await getDocument(env, `usernames/${username}`)) throw Object.assign(new Error("USERNAME_EXISTS"), { status: 409 });
  await assertEmployeeUnique(env, { ...employee, email }, employee.id);

  let uid = "";
  try {
    const created = await authAdminRequest(env, "create", { email, password: account.password, displayName: employee.name, emailVerified: false, disabled: false });
    uid = created.localId;
    await authAdminRequest(env, "update", { localId: uid, displayName: employee.name, customAttributes: JSON.stringify({ role, employeeId, branch: employee.branch, branchId: employee.branchId || "" }), disableUser: false });
    const now = new Date().toISOString();
    const employeeRecord = {
      ...employee,
      uid,
      email,
      username,
      accountRole: role,
      accountStatus: "active",
      loginCreatedAt: now,
      loginCreatedByUid: user.uid,
      loginCreatedByEmail: user.email,
      updatedAt: now,
    };
    const reservationWrites = await uniqueReservationWrites(env, employeeRecord, employee);
    await commitWrites(env, [
      { path: `employees/${employeeId}`, data: employeeRecord },
      { path: `profiles/${uid}`, data: { uid, employeeId, name: employee.name, englishName: employee.englishName || "", email, username, role, branch: employee.branch, branchId: employee.branchId || "", active: true, createdAt: now, updatedAt: now }, exists: false },
      { path: `usernames/${username}`, data: { username, email, uid, active: true }, exists: false },
      { path: `passwordResetEmails/${email}`, data: { email, uid, active: true } },
      { path: `users/${uid}`, data: { id: uid, employeeId, name: employee.name, englishName: employee.englishName || "", email, username, role, branch: employee.branch, branchId: employee.branchId || "", status: employee.status, active: true, createdAt: now }, exists: false },
      auditLogWrite("login_account_created", user, employeeRecord),
      ...reservationWrites,
    ]);
    return { ok: true, employee: employeeRecord, uid };
  } catch (error) {
    if (uid) {
      const committed = await getDocument(env, `employees/${employeeId}`).catch(() => null);
      if (committed?.uid === uid) return { ok: true, employee: committed, uid, recovered: true };
      await authAdminRequest(env, "delete", { localId: uid }).catch(() => {});
    }
    throw error;
  }
}

async function handleDeactivateEmployee(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const employeeId = String(body?.employeeId || "");
  if (!employeeId) throw Object.assign(new Error("Employee identifier is missing"), { status: 400 });
  const employee = await getDocument(env, `employees/${employeeId}`);
  if (!employee) throw Object.assign(new Error("Employee record was not found"), { status: 404 });
  if (normalizeEmployeeStatus(employee.status) === "អសកម្ម") {
    return { ok: true, employee: { ...employee, status: "អសកម្ម" }, alreadyInactive: true };
  }
  const pendingActions = await queryDocuments(env, "employmentActions", "employeeId", employeeId);
  if (pendingActions.some((item) => item.status === "បានកំណត់")) {
    throw Object.assign(new Error("បុគ្គលិកនេះមានប្រតិបត្តិការថ្ងៃអនាគត។ សូមលុបចោលវាមុននឹងដាក់ជាអសកម្ម។"), { status: 409 });
  }
  const uid = String(employee.uid || body?.uid || "");
  const profile = uid ? await getDocument(env, `profiles/${uid}`) : null;
  if (uid && !profile) throw Object.assign(new Error("Linked account profile was not found"), { status: 404 });
  if (profile && user.role !== "admin" && profile.role !== "employee") throw Object.assign(new Error("Only Admin can deactivate HR or Admin accounts"), { status: 403 });
  if (uid === user.uid) throw Object.assign(new Error("You cannot deactivate your own account"), { status: 400 });
  if (uid) await authAdminRequest(env, "update", { localId: uid, disableUser: true });
  const now = new Date().toISOString();
  const inactiveDate = currentCambodiaDateISO();
  const employeeRecord = {
    ...employee,
    status: "អសកម្ម",
    accountStatus: uid ? "disabled" : accountStatusForEmployee(employee),
    endDate: inactiveDate,
    employmentPeriods: closeEmploymentPeriod(employee, inactiveDate),
    archivedAt: now,
    archivedByUid: user.uid,
    archivedByEmail: user.email,
    updatedAt: now,
  };
  try {
    await commitWrites(env, [
      { path: `employees/${employeeId}`, data: employeeRecord },
      ...(profile ? [
        { path: `profiles/${uid}`, data: { ...profile, active: false, status: "អសកម្ម", updatedAt: now } },
        ...(profile.username ? [{ path: `usernames/${profile.username}`, data: { username: profile.username, email: profile.email, uid, active: false } }] : []),
        ...(profile.email ? [{ path: `passwordResetEmails/${profile.email}`, data: { email: profile.email, uid, active: false } }] : []),
        { path: `users/${uid}`, data: { id: uid, employeeId, name: profile.name, englishName: profile.englishName || employee.englishName || "", email: profile.email, username: profile.username, role: profile.role, branch: profile.branch, branchId: profile.branchId || employee.branchId || "", status: "អសកម្ម", active: false, updatedAt: now } },
      ] : []),
      auditLogWrite("employee_deactivated", user, employeeRecord, { effectiveDate: inactiveDate, accountAffected: Boolean(uid) }),
      ...(uid ? [auditLogWrite("login_account_disabled", user, employeeRecord, { reason: "employee_deactivated" })] : []),
    ]);
  } catch (error) {
    const committed = await getDocument(env, `employees/${employeeId}`).catch(() => null);
    if (committed?.updatedAt === now && committed.status === "អសកម្ម") return { ok: true, deactivated: true, employee: committed, preservedHistory: true, recovered: true };
    if (uid) await authAdminRequest(env, "update", { localId: uid, disableUser: false }).catch(() => {});
    throw error;
  }
  return { ok: true, deactivated: true, employee: employeeRecord, preservedHistory: true };
}

async function handleReactivateEmployee(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const employeeId = String(body?.employeeId || "").trim();
  if (!employeeId) throw Object.assign(new Error("Employee identifier is missing"), { status: 400 });
  const employee = await getDocument(env, `employees/${employeeId}`);
  if (!employee) throw Object.assign(new Error("Employee record was not found"), { status: 404 });

  const currentStatus = normalizeEmployeeStatus(employee.status);
  if (currentStatus !== "អសកម្ម") {
    return { ok: true, employee: { ...employee, status: currentStatus || employee.status }, alreadyActive: true };
  }

  const uid = String(employee.uid || body?.uid || "");
  const profile = uid ? await getDocument(env, `profiles/${uid}`) : null;
  if (uid && !profile) throw Object.assign(new Error("Linked account profile was not found"), { status: 404 });
  if (profile && user.role !== "admin" && profile.role !== "employee") {
    throw Object.assign(new Error("Only Admin can reactivate HR or Admin accounts"), { status: 403 });
  }
  const rehireDate = String(body?.rehireDate || "").trim();
  if (!validDateISO(rehireDate)) throw Object.assign(new Error("សូមបញ្ចូលថ្ងៃចូលធ្វើការវិញឲ្យត្រឹមត្រូវ"), { status: 400 });
  const initialPeriods = employmentPeriods(employee);
  const inferredLegacyEndDate = String(employee.endDate || employee.archivedAt || "").slice(0, 10);
  const employeeWithClosedPeriod = initialPeriods.some((period) => !period.endDate) && inferredLegacyEndDate
    ? { ...employee, endDate: inferredLegacyEndDate, employmentPeriods: closeEmploymentPeriod(employee, inferredLegacyEndDate) }
    : employee;
  const previousPeriods = employmentPeriods(employeeWithClosedPeriod);
  const lastEndDate = [...previousPeriods].reverse().find((period) => period.endDate)?.endDate || employeeWithClosedPeriod.endDate || "";
  if (lastEndDate && rehireDate <= lastEndDate) {
    throw Object.assign(new Error(`ថ្ងៃចូលធ្វើការវិញត្រូវក្រោយថ្ងៃបញ្ចប់ការងារ ${lastEndDate}`), { status: 400 });
  }
  if (uid) await authAdminRequest(env, "update", { localId: uid, disableUser: false });

  const now = new Date().toISOString();
  const nextPeriods = appendEmploymentPeriod(employeeWithClosedPeriod, rehireDate);
  const employeeRecord = {
    ...employee,
    status: "សកម្ម",
    accountStatus: uid ? "active" : accountStatusForEmployee(employee),
    currentStartDate: rehireDate,
    endDate: "",
    employmentPeriods: nextPeriods,
    archivedAt: "",
    archivedByUid: "",
    archivedByEmail: "",
    reactivatedAt: now,
    reactivatedByUid: user.uid,
    reactivatedByEmail: user.email,
    updatedAt: now,
  };
  const actionId = `EA-${employeeId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const actionRecord = {
    id: actionId,
    employeeId,
    employeeName: employee.name || "",
    type: "rehire",
    effectiveDate: rehireDate,
    decisionNo: "",
    reason: String(body?.reason || "").trim() || "ចូលធ្វើការវិញ",
    note: "",
    oldValues: employmentSnapshot(employee),
    newValues: {
      status: "សកម្ម",
      currentStartDate: rehireDate,
      endDate: "",
      employmentPeriods: nextPeriods,
    },
    status: "បានអនុវត្ត",
    createdAt: now,
    createdByUid: user.uid,
    createdByEmail: user.email,
    appliedAt: now,
  };
  try {
    await commitWrites(env, [
      { path: `employees/${employeeId}`, data: employeeRecord },
      { path: `employmentActions/${actionId}`, data: actionRecord, exists: false },
      ...(profile ? [
        { path: `profiles/${uid}`, data: { ...profile, branch: employee.branch, branchId: employee.branchId || profile.branchId || "", active: true, status: "សកម្ម", updatedAt: now } },
        ...(profile.username ? [{ path: `usernames/${profile.username}`, data: { username: profile.username, email: profile.email, uid, active: true } }] : []),
        ...(profile.email ? [{ path: `passwordResetEmails/${profile.email}`, data: { email: profile.email, uid, active: true } }] : []),
        { path: `users/${uid}`, data: { id: uid, employeeId, name: profile.name, englishName: profile.englishName || employee.englishName || "", email: profile.email, username: profile.username, role: profile.role, branch: employee.branch, branchId: employee.branchId || profile.branchId || "", status: "សកម្ម", active: true, updatedAt: now } },
      ] : []),
      auditLogWrite("employee_rehired", user, employeeRecord, { effectiveDate: rehireDate, accountAffected: Boolean(uid) }),
      ...(uid ? [auditLogWrite("login_account_enabled", user, employeeRecord, { reason: "employee_rehired", effectiveDate: rehireDate })] : []),
    ]);
  } catch (error) {
    const committed = await getDocument(env, `employees/${employeeId}`).catch(() => null);
    if (committed?.updatedAt === now && committed.status === "សកម្ម") {
      return { ok: true, reactivated: true, employee: committed, preservedHistory: true, recovered: true };
    }
    if (uid) await authAdminRequest(env, "update", { localId: uid, disableUser: true }).catch(() => {});
    throw error;
  }
  return { ok: true, reactivated: true, employee: employeeRecord, preservedHistory: true };
}

async function handleDeleteEmployeeAccount(user, env, body) {
  if (user.role !== "admin") throw Object.assign(new Error("Admin role is required"), { status: 403 });
  const employeeId = String(body?.employeeId || "").trim();
  if (!employeeId) throw Object.assign(new Error("Employee identifier is missing"), { status: 400 });
  const employee = await getDocument(env, `employees/${employeeId}`);
  if (!employee) throw Object.assign(new Error("Employee record was not found"), { status: 404 });

  const uid = String(employee.uid || body?.uid || "").trim();
  if (!uid) {
    return { ok: true, alreadyDeleted: true, employee, preservedHistory: true };
  }
  if (uid === user.uid) {
    throw Object.assign(new Error("អ្នកមិនអាចលុបគណនី Admin ដែលកំពុងប្រើរបស់ខ្លួនបានទេ"), { status: 400 });
  }

  const [profile, usernameRows, resetEmailRows] = await Promise.all([
    getDocument(env, `profiles/${uid}`),
    queryDocuments(env, "usernames", "uid", uid),
    queryDocuments(env, "passwordResetEmails", "uid", uid),
  ]);
  const username = String(profile?.username || employee.username || "").trim().toLowerCase();
  const accountEmail = normalizeEmail(profile?.email || employee.email);

  try {
    await authAdminRequest(env, "delete", { localId: uid });
  } catch (error) {
    // This keeps the cleanup endpoint safely retryable when Firebase Auth was
    // deleted but a prior Firestore commit was interrupted.
    if (!/USER_NOT_FOUND|EMAIL_NOT_FOUND/i.test(String(error?.message || ""))) throw error;
  }

  const now = new Date().toISOString();
  const employeeRecord = {
    ...employee,
    uid: "",
    username: "",
    accountRole: "",
    accountStatus: "deleted",
    loginDeletedAt: now,
    loginDeletedByUid: user.uid,
    loginDeletedByEmail: user.email,
    updatedAt: now,
  };
  const deletePaths = new Set([
    `profiles/${uid}`,
    `users/${uid}`,
    ...usernameRows.map((row) => `usernames/${row.id}`),
    ...resetEmailRows.map((row) => `passwordResetEmails/${row.id}`),
  ]);
  if (username) deletePaths.add(`usernames/${username}`);
  if (accountEmail) deletePaths.add(`passwordResetEmails/${accountEmail}`);
  const auditId = `AUD-ACCOUNT-DELETE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  await commitWrites(env, [
    { path: `employees/${employeeId}`, data: employeeRecord },
    ...Array.from(deletePaths).map((path) => ({ delete: path })),
    {
      path: `auditLogs/${auditId}`,
      data: {
        id: auditId,
        type: "login_account_deleted",
        employeeId,
        employeeName: employee.name || "",
        targetUid: uid,
        targetEmail: accountEmail,
        targetRole: profile?.role || employee.accountRole || "",
        actorUid: user.uid,
        actorEmail: user.email,
        createdAt: now,
        preservedEmployeeHistory: true,
      },
      exists: false,
    },
  ]);
  return { ok: true, deleted: true, employee: employeeRecord, preservedHistory: true };
}

async function handleUpdateEmployee(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const employee = body?.employee || {};
  if (!employee.id) throw Object.assign(new Error("Employee identifier is missing"), { status: 400 });
  if (!employee.name || !employee.englishName) throw Object.assign(new Error("Khmer and English employee names are required"), { status: 400 });
  employee.englishName = String(employee.englishName).trim().replace(/\s+/g, " ").toUpperCase();
  if (!/^[A-Z][A-Z .'-]*$/.test(employee.englishName)) throw Object.assign(new Error("Invalid English employee name"), { status: 400 });
  const previous = await getDocument(env, `employees/${employee.id}`);
  if (!previous) throw Object.assign(new Error("Employee record was not found"), { status: 404 });
  const previousStatus = requireEmployeeStatus(previous.status, "សកម្ម");
  const requestedStatus = requireEmployeeStatus(employee.status, previousStatus);
  if (requestedStatus !== previousStatus) {
    throw Object.assign(new Error("Use deactivate/reactivate or an employment action to change employee status"), { status: 400 });
  }
  employee.status = previousStatus;
  const profile = employee.uid ? await getDocument(env, `profiles/${employee.uid}`) : null;
  if (employee.uid && !profile) throw Object.assign(new Error("Linked account profile was not found"), { status: 404 });
  if (profile && user.role !== "admin" && profile.role !== "employee") throw Object.assign(new Error("Only Admin can edit HR or Admin accounts"), { status: 403 });
  const email = normalizeEmail(employee.email || profile?.email);
  if (profile && !email.endsWith("@borribo.com.kh")) throw Object.assign(new Error("Account email must use @borribo.com.kh"), { status: 400 });
  const unique = await assertEmployeeUnique(env, { ...employee, email }, employee.id);
  const disabled = previousStatus === "អសកម្ម";
  if (employee.uid) await authAdminRequest(env, "update", { localId: employee.uid, email, displayName: employee.name, customAttributes: JSON.stringify({ role: profile.role, employeeId: employee.id, branch: employee.branch, branchId: employee.branchId || "" }), disableUser: disabled });
  const now = new Date().toISOString();
  const employeeRecord = {
    ...employee,
    email: unique.email,
    phoneNormalized: unique.phone,
    accountStatus: profile ? (disabled ? "disabled" : "active") : accountStatusForEmployee(employee),
    ...(profile ? { username: profile.username || employee.username || "", accountRole: profile.role } : {}),
    updatedAt: now,
  };
  const reservationWrites = await uniqueReservationWrites(env, employeeRecord, previous);
  try {
    await commitWrites(env, [
      { path: `employees/${employee.id}`, data: employeeRecord },
      ...(profile ? [
        { path: `profiles/${employee.uid}`, data: { ...profile, name: employee.name, englishName: employee.englishName, email, branch: employee.branch, branchId: employee.branchId || "", active: !disabled, status: employee.status, updatedAt: now } },
        ...(profile.username ? [{ path: `usernames/${profile.username}`, data: { username: profile.username, email, uid: employee.uid, active: !disabled } }] : []),
        ...(profile.email && profile.email !== email ? [{ path: `passwordResetEmails/${profile.email}`, data: { email: profile.email, uid: employee.uid, active: false } }] : []),
        { path: `passwordResetEmails/${email}`, data: { email, uid: employee.uid, active: !disabled } },
        { path: `users/${employee.uid}`, data: { id: employee.uid, employeeId: employee.id, name: employee.name, englishName: employee.englishName, email, username: profile.username, role: profile.role, branch: employee.branch, branchId: employee.branchId || "", status: employee.status, active: !disabled, updatedAt: now } },
      ] : []),
      ...reservationWrites,
    ]);
  } catch (error) {
    const committed = await getDocument(env, `employees/${employee.id}`).catch(() => null);
    if (committed?.updatedAt === now) return { ok: true, employee: committed, recovered: true };
    if (employee.uid) await authAdminRequest(env, "update", { localId: employee.uid, email: profile.email, displayName: previous.name, customAttributes: JSON.stringify({ role: profile.role, employeeId: previous.id, branch: previous.branch, branchId: previous.branchId || "" }), disableUser: normalizeEmployeeStatus(previous.status) === "អសកម្ម" }).catch(() => {});
    throw error;
  }
  return { ok: true, employee: employeeRecord };
}

const EMPLOYMENT_ACTION_TYPES = ["transfer", "promotion", "job_change", "transfer_and_job_change", "resignation"];

function validDateISO(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function currentCambodiaDateISO() {
  const parts = cambodiaParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function actionNewValues(employee, action) {
  if (action.type === "resignation") {
    return { status: "អសកម្ម", endDate: action.effectiveDate };
  }
  const values = {};
  if (["transfer", "transfer_and_job_change"].includes(action.type)) {
    values.branch = String(action.branch || "").trim();
    values.branchId = String(action.branchId || "").trim();
  }
  if (["promotion", "job_change", "transfer_and_job_change"].includes(action.type)) {
    values.department = String(action.department || "").trim();
    values.role = String(action.role || "").trim();
    values.departmentId = String(action.departmentId || "").trim();
    values.roleId = String(action.roleId || "").trim();
  }
  return values;
}

function employmentSnapshot(employee) {
  return {
    branch: employee.branch || "",
    branchId: employee.branchId || "",
    department: employee.dept || "",
    departmentId: employee.departmentId || "",
    role: employee.role || "",
    roleId: employee.roleId || "",
    status: normalizeEmployeeStatus(employee.status, "សកម្ម"),
    startDate: employee.startDate || "",
    currentStartDate: employee.currentStartDate || "",
    endDate: employee.endDate || "",
    employmentPeriods: employmentPeriods(employee),
  };
}

async function applyEmploymentActionRecord(env, record) {
  const employee = await getDocument(env, `employees/${record.employeeId}`);
  if (!employee) throw new Error("Employee record was not found");
  const oldValues = employmentSnapshot(employee);
  const patch = record.newValues || {};
  const now = new Date().toISOString();
  const updated = {
    ...employee,
    status: normalizeEmployeeStatus(employee.status, "សកម្ម"),
    ...(patch.branch !== undefined ? { branch: patch.branch } : {}),
    ...(patch.branchId !== undefined ? { branchId: patch.branchId } : {}),
    ...(patch.department !== undefined ? { dept: patch.department } : {}),
    ...(patch.departmentId !== undefined ? { departmentId: patch.departmentId } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.roleId !== undefined ? { roleId: patch.roleId } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
    updatedAt: now,
  };

  const applied = { ...record, oldValues, status: "បានអនុវត្ត", appliedAt: now, error: "" };
  const profile = employee.uid ? await getDocument(env, `profiles/${employee.uid}`) : null;
  if (employee.uid && !profile) throw new Error("Linked account profile was not found");
  const disabled = normalizeEmployeeStatus(updated.status) === "អសកម្ម";
  if (disabled) {
    updated.accountStatus = employee.uid ? "disabled" : accountStatusForEmployee(employee);
    updated.employmentPeriods = closeEmploymentPeriod(employee, patch.endDate || currentCambodiaDateISO());
  }
  if (employee.uid) await authAdminRequest(env, "update", {
    localId: employee.uid,
    email: updated.email || profile.email,
    displayName: updated.name,
    customAttributes: JSON.stringify({ role: profile.role, employeeId: updated.id, branch: updated.branch, branchId: updated.branchId || "" }),
    disableUser: disabled,
  });
  try {
    await commitWrites(env, [
      { path: `employees/${updated.id}`, data: updated },
      { path: `employmentActions/${record.id}`, data: applied },
      ...(profile ? [
        { path: `profiles/${employee.uid}`, data: { ...profile, name: updated.name, branch: updated.branch, branchId: updated.branchId || "", active: !disabled, status: updated.status, updatedAt: now } },
        ...(profile.username ? [{ path: `usernames/${profile.username}`, data: { username: profile.username, email: updated.email || profile.email, uid: employee.uid, active: !disabled } }] : []),
        ...((updated.email || profile.email) ? [{ path: `passwordResetEmails/${updated.email || profile.email}`, data: { email: updated.email || profile.email, uid: employee.uid, active: !disabled } }] : []),
        { path: `users/${employee.uid}`, data: { id: employee.uid, employeeId: updated.id, name: updated.name, englishName: updated.englishName || profile.englishName || "", email: updated.email || profile.email, username: profile.username || updated.username || "", role: profile.role, branch: updated.branch, branchId: updated.branchId || "", status: updated.status, active: !disabled, updatedAt: now } },
      ] : []),
      ...(disabled ? [
        auditLogWrite("employee_deactivated", { uid: record.createdByUid, email: record.createdByEmail }, updated, { effectiveDate: patch.endDate || record.effectiveDate, source: "employment_action", accountAffected: Boolean(employee.uid) }),
        ...(employee.uid ? [auditLogWrite("login_account_disabled", { uid: record.createdByUid, email: record.createdByEmail }, updated, { reason: "employment_action_resignation", effectiveDate: patch.endDate || record.effectiveDate })] : []),
      ] : []),
    ]);
  } catch (error) {
    const committed = await getDocument(env, `employmentActions/${record.id}`).catch(() => null);
    if (committed?.status === "បានអនុវត្ត") return { employee: updated, action: committed, recovered: true };
    if (employee.uid) await authAdminRequest(env, "update", { localId: employee.uid, email: employee.email || profile.email, displayName: employee.name, customAttributes: JSON.stringify({ role: profile.role, employeeId: employee.id, branch: employee.branch, branchId: employee.branchId || "" }), disableUser: normalizeEmployeeStatus(employee.status) === "អសកម្ម" }).catch(() => {});
    throw error;
  }
  return { employee: updated, action: applied };
}

async function handleCreateEmploymentAction(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const employeeId = String(body?.employeeId || "").trim();
  const action = body?.action || {};
  const employee = await getDocument(env, `employees/${employeeId}`);
  if (!employee) throw Object.assign(new Error("Employee record was not found"), { status: 404 });
  if (!EMPLOYMENT_ACTION_TYPES.includes(action.type)) throw Object.assign(new Error("Invalid employment action type"), { status: 400 });
  if (!validDateISO(action.effectiveDate)) throw Object.assign(new Error("Effective date is invalid"), { status: 400 });
  const decisionNo = normalizeDecisionNo(action.decisionNo);
  if (!String(action.reason || "").trim() || !decisionNo) throw Object.assign(new Error("Reason and decision number are required"), { status: 400 });
  if (normalizeEmployeeStatus(employee.status) === "អសកម្ម") throw Object.assign(new Error("បុគ្គលិកនេះអសកម្មរួចហើយ"), { status: 400 });
  if (action.type === "resignation" && employee.uid === user.uid) throw Object.assign(new Error("អ្នកមិនអាចបិទគណនីដែលកំពុងប្រើរបស់ខ្លួនបានទេ"), { status: 400 });

  const existingActions = await queryDocuments(env, "employmentActions", "employeeId", employeeId);
  if (existingActions.some((item) => item.status === "បានកំណត់")) {
    throw Object.assign(new Error("បុគ្គលិកនេះមានប្រតិបត្តិការថ្ងៃអនាគតរួចហើយ។ សូមលុបចោលវាមុន។"), { status: 409 });
  }
  const allActions = await listDocuments(env, "employmentActions");
  if (allActions.some((item) => normalizeDecisionNo(item.decisionNo) === decisionNo)) throw Object.assign(new Error("DECISION_NO_EXISTS"), { status: 409 });
  const decisionPath = `decisionUnique/${base64Url(new TextEncoder().encode(decisionNo))}`;
  if (await getDocument(env, decisionPath)) throw Object.assign(new Error("DECISION_NO_EXISTS"), { status: 409 });

  if (employee.uid) {
    const profile = await getDocument(env, `profiles/${employee.uid}`);
    if (!profile) throw Object.assign(new Error("Linked account profile was not found"), { status: 404 });
    if (user.role !== "admin" && profile.role !== "employee") throw Object.assign(new Error("Only Admin can manage HR or Admin accounts"), { status: 403 });
  }

  const newValues = actionNewValues(employee, action);
  if (["transfer", "transfer_and_job_change"].includes(action.type) && !newValues.branch) throw Object.assign(new Error("New branch is required"), { status: 400 });
  if (["promotion", "job_change", "transfer_and_job_change"].includes(action.type) && (!newValues.department || !newValues.role)) throw Object.assign(new Error("New department and role are required"), { status: 400 });
  const changed = Object.entries(newValues).some(([key, value]) => employmentSnapshot(employee)[key] !== value);
  if (!changed) throw Object.assign(new Error("មិនមានព័ត៌មានថ្មីសម្រាប់អនុវត្តទេ"), { status: 400 });

  const now = new Date().toISOString();
  const scheduled = action.effectiveDate > currentCambodiaDateISO();
  const id = `EA-${employeeId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const record = {
    id,
    employeeId,
    employeeName: employee.name,
    type: action.type,
    effectiveDate: action.effectiveDate,
    decisionNo,
    decisionNoNormalized: decisionNo,
    reason: String(action.reason).trim(),
    note: String(action.note || "").trim(),
    oldValues: employmentSnapshot(employee),
    newValues,
    status: scheduled ? "បានកំណត់" : "កំពុងអនុវត្ត",
    createdAt: now,
    createdByUid: user.uid,
    createdByEmail: user.email,
  };
  await commitWrites(env, [
    { path: `employmentActions/${id}`, data: record, exists: false },
    { path: decisionPath, data: { actionId: id, decisionNo, employeeId, createdAt: now }, exists: false },
  ]);
  if (scheduled) return { ok: true, scheduled: true, action: record };
  try {
    const result = await applyEmploymentActionRecord(env, record);
    return { ok: true, scheduled: false, ...result };
  } catch (error) {
    await putDocument(env, `employmentActions/${id}`, { ...record, status: "បរាជ័យ", error: error.message, failedAt: new Date().toISOString() }).catch(() => {});
    throw error;
  }
}

async function handleCancelEmploymentAction(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const actionId = String(body?.actionId || "").trim();
  const record = await getDocument(env, `employmentActions/${actionId}`);
  if (!record) throw Object.assign(new Error("Employment action was not found"), { status: 404 });
  if (record.status !== "បានកំណត់") throw Object.assign(new Error("អាចលុបចោលបានតែប្រតិបត្តិការដែលមិនទាន់អនុវត្ត"), { status: 400 });
  const canceled = { ...record, status: "បានលុបចោល", canceledAt: new Date().toISOString(), canceledByUid: user.uid, canceledByEmail: user.email };
  await putDocument(env, `employmentActions/${actionId}`, canceled);
  return { ok: true, action: canceled };
}

async function processScheduledEmploymentActions(env) {
  const today = currentCambodiaDateISO();
  const records = (await listDocuments(env, "employmentActions"))
    .filter((record) => record.status === "បានកំណត់" && record.effectiveDate <= today)
    .sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
  const results = [];
  for (const record of records) {
    const applying = { ...record, status: "កំពុងអនុវត្ត", startedAt: new Date().toISOString() };
    await putDocument(env, `employmentActions/${record.id}`, applying);
    try {
      const result = await applyEmploymentActionRecord(env, applying);
      results.push({ id: record.id, ok: true, employeeId: result.employee.id });
    } catch (error) {
      await putDocument(env, `employmentActions/${record.id}`, { ...applying, status: "បរាជ័យ", error: error.message, failedAt: new Date().toISOString() }).catch(() => {});
      results.push({ id: record.id, ok: false, error: error.message });
    }
  }
  return { processed: results.length, results };
}

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

function normalizeBackupFrequency(value) {
  return {
    "ប្រចាំថ្ងៃ": "daily",
    "ប្រចាំសប្តាហ៍": "weekly",
    "ប្រចាំខែ": "monthly",
  }[value] || (BACKUP_FREQUENCY_MS[value] ? value : DEFAULT_SYSTEM_SETTINGS.backupFreq);
}

async function loadSystemSettings(env) {
  const document = await getDocument(env, "settings/system") || {};
  const { id: _documentId, ...stored } = document;
  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...stored,
    sessionTimeoutMinutes: [15, 30, 60].includes(Number(stored.sessionTimeoutMinutes))
      ? Number(stored.sessionTimeoutMinutes)
      : ({ "១៥ នាទី": 15, "៣០ នាទី": 30, "១ ម៉ោង": 60 }[stored.sessionTimeout] || 30),
    backupFreq: normalizeBackupFrequency(stored.backupFreq),
  };
}

async function updateSystemRuntimeSettings(env, patch) {
  const current = await loadSystemSettings(env);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await putDocument(env, "settings/system", next);
  return next;
}

function plainNotificationText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function notificationEmailSubject(type, row) {
  if (type === "leave_request") return `Borribo HRMS: សំណើសុំច្បាប់ថ្មី - ${row.name || row.employeeId || "បុគ្គលិក"}`;
  if (type === "leave_decision") return `Borribo HRMS: ${row.status || "លទ្ធផលសំណើច្បាប់"}`;
  if (type === "check_in") return `Borribo HRMS: Check-in - ${row.name || row.id || "បុគ្គលិក"}`;
  return `Borribo HRMS: Check-out - ${row.name || row.id || "បុគ្គលិក"}`;
}

async function sendEmail(env, { to, subject, text }) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM_EMAIL) {
    throw new Error("Email provider is not configured (RESEND_API_KEY / NOTIFICATION_FROM_EMAIL)");
  }
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) throw new Error("No email recipients were found");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.NOTIFICATION_FROM_EMAIL,
      to: recipients,
      subject,
      text,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id) throw new Error(result?.message || `Email provider failed (${response.status})`);
  return result;
}

async function managerNotificationEmails(env) {
  const profiles = await listDocuments(env, "profiles");
  return [...new Set(profiles
    .filter((profile) => profile.active !== false && ["admin", "hr"].includes(profile.role))
    .map((profile) => String(profile.email || "").trim().toLowerCase())
    .filter(Boolean))];
}

async function employeeNotificationEmail(env, row) {
  const employeeUid = row.employeeUid || row.uid || "";
  if (employeeUid) {
    const profile = await getDocument(env, `profiles/${employeeUid}`);
    if (profile?.email) return String(profile.email).trim().toLowerCase();
  }
  const employeeId = row.employeeId || row.empId || row.id || "";
  if (employeeId) {
    const employee = await getDocument(env, `employees/${employeeId}`);
    if (employee?.email) return String(employee.email).trim().toLowerCase();
  }
  return "";
}

async function deliverEventEmail(user, env, body, row, text, state) {
  const settings = await loadSystemSettings(env);
  if (!settings.emailNotif) return { ok: true, skipped: true, reason: "disabled" };
  // Attendance can generate hundreds of events per day. Email is intentionally
  // reserved for leave workflow events; attendance remains available through
  // in-app and Telegram notifications.
  if (!["leave_request", "leave_decision"].includes(body.type)) {
    return { ok: true, skipped: true, reason: "email-event-disabled" };
  }
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_FROM_EMAIL) {
    return { ok: true, skipped: true, reason: "provider-not-configured" };
  }
  const recipients = body.type === "leave_decision"
    ? [await employeeNotificationEmail(env, row)].filter(Boolean)
    : await managerNotificationEmails(env);
  if (!recipients.length) return { ok: true, skipped: true, reason: "no-recipients" };
  const id = await hashKey(`email:${body.type}:${body.recordId}:${state}`);
  if (await getDocument(env, `emailEvents/${id}`)) return { ok: true, skipped: true, reason: "duplicate" };
  try {
    const result = await sendEmail(env, {
      to: recipients,
      subject: notificationEmailSubject(body.type, row),
      text: plainNotificationText(text),
    });
    const now = new Date().toISOString();
    await putDocument(env, `emailEvents/${id}`, {
      id,
      type: body.type,
      recordId: body.recordId,
      recipients,
      status: "sent",
      sentAt: now,
      providerMessageId: result.id,
    });
    await putDocument(env, `emailOutbox/${id}`, {
      id,
      type: body.type,
      recordId: body.recordId,
      recipients,
      subject: notificationEmailSubject(body.type, row),
      message: plainNotificationText(text),
      status: "បានផ្ញើ",
      providerMessageId: result.id,
      actorUid: user.uid,
      createdAt: now,
    });
    return { ok: true, messageId: result.id, recipients: recipients.length };
  } catch (error) {
    await putDocument(env, `emailOutbox/${id}`, {
      id,
      type: body.type,
      recordId: body.recordId,
      recipients,
      subject: notificationEmailSubject(body.type, row),
      message: plainNotificationText(text),
      status: "ផ្ញើបរាជ័យ",
      error: error.message,
      actorUid: user.uid,
      createdAt: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

function backupOutputPrefix(env, now = new Date()) {
  const rawBucket = String(env.FIRESTORE_BACKUP_BUCKET || "").trim().replace(/^gs:\/\//, "").replace(/\/$/, "");
  if (!rawBucket) throw new Error("FIRESTORE_BACKUP_BUCKET is missing");
  const date = now.toISOString().slice(0, 10).replace(/-/g, "/");
  return `gs://${rawBucket}/borribo-hrms/${date}/backup-${now.toISOString().replace(/[:.]/g, "-")}`;
}

async function checkFirestoreBackupOperation(env) {
  const settings = await loadSystemSettings(env);
  if (settings.lastBackupStatus !== "started" || !settings.lastBackupOperation) {
    return { ok: true, skipped: true, reason: "no-running-backup" };
  }
  const token = await getGoogleAccessToken(env);
  const response = await fetch(`https://firestore.googleapis.com/v1/${settings.lastBackupOperation}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || `Backup operation lookup failed (${response.status})`);
  if (!result.done) return { ok: true, running: true, operation: settings.lastBackupOperation };
  if (result.error) {
    await updateSystemRuntimeSettings(env, {
      lastBackupStatus: "failed",
      lastBackupError: result.error.message || "Firestore backup failed",
      lastBackupCompletedAt: new Date().toISOString(),
    });
    return { ok: false, failed: true, error: result.error.message || "Firestore backup failed" };
  }
  const completedAt = new Date().toISOString();
  await updateSystemRuntimeSettings(env, {
    lastBackupStatus: "completed",
    lastBackupError: "",
    lastBackupCompletedAt: completedAt,
  });
  return { ok: true, completed: true, completedAt, operation: settings.lastBackupOperation };
}

async function startFirestoreBackup(env, force = false) {
  let settings = await loadSystemSettings(env);
  if (settings.lastBackupStatus === "started" && settings.lastBackupOperation) {
    const operation = await checkFirestoreBackupOperation(env);
    if (operation.running) return { ok: true, skipped: true, reason: "backup-in-progress", operation: settings.lastBackupOperation };
    settings = await loadSystemSettings(env);
  }
  if (!force && !settings.autoBackup) return { ok: true, skipped: true, reason: "disabled" };
  if (!env.FIRESTORE_BACKUP_BUCKET) return { ok: true, skipped: true, reason: "bucket-not-configured" };
  const interval = BACKUP_FREQUENCY_MS[normalizeBackupFrequency(settings.backupFreq)];
  const successfulBackupAt = settings.lastBackupStatus === "completed"
    ? new Date(settings.lastBackupCompletedAt || settings.lastBackupAt || 0).getTime()
    : 0;
  if (!force && Number.isFinite(successfulBackupAt) && Date.now() - successfulBackupAt < interval) {
    return { ok: true, skipped: true, reason: "not-due" };
  }

  const startedAt = new Date().toISOString();
  try {
    const token = await getGoogleAccessToken(env);
    const outputUriPrefix = backupOutputPrefix(env, new Date(startedAt));
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default):exportDocuments`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ outputUriPrefix }),
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.name) throw new Error(result?.error?.message || `Firestore export failed (${response.status})`);
    await updateSystemRuntimeSettings(env, {
      lastBackupAt: startedAt,
      lastBackupStatus: "started",
      lastBackupError: "",
      lastBackupOperation: result.name,
      lastBackupOutput: outputUriPrefix,
    });
    return { ok: true, operation: result.name, outputUriPrefix, startedAt };
  } catch (error) {
    await updateSystemRuntimeSettings(env, {
      lastBackupAt: startedAt,
      lastBackupStatus: "failed",
      lastBackupError: error.message,
    }).catch(() => {});
    throw error;
  }
}

async function logTelegramEvent(env, id, data) {
  await putDocument(env, `telegramOutbox/${id}`, { id, ...data, createdAt: new Date().toISOString() });
}

const ATTENDANCE_DEFAULT_WORKING_HOURS = {
  schedules: {
    weekday: { start: "08:00", end: "17:00", grace: "15" },
    saturday: { start: "08:00", end: "12:00", grace: "15" },
  },
  workDays: ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រហ", "សុក្រ", "សៅរ៍"],
};

const ATTENDANCE_WEEKDAYS = {
  Monday: "ច័ន្ទ",
  Tuesday: "អង្គារ",
  Wednesday: "ពុធ",
  Thursday: "ព្រហ",
  Friday: "សុក្រ",
  Saturday: "សៅរ៍",
  Sunday: "អាទិត្យ",
};

function httpError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeAttendanceAction(value) {
  const action = String(value || "").trim().toLowerCase();
  if (["in", "check-in", "check_in"].includes(action)) return "in";
  if (["out", "check-out", "check_out"].includes(action)) return "out";
  throw httpError("Attendance action មិនត្រឹមត្រូវ", 400);
}

function configuredAttendanceValue(primary, fallback = "") {
  return String(primary ?? "").trim() === "" ? fallback : primary;
}

function attendanceDateISO(date = new Date()) {
  const parts = cambodiaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function attendanceTimeLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function attendanceDateLabel(dateISO) {
  return new Intl.DateTimeFormat("km-KH", {
    timeZone: "Asia/Phnom_Penh",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateISO}T12:00:00+07:00`));
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function cambodiaMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function safeWorkingHours(workingHours = {}) {
  return {
    schedules: {
      weekday: {
        ...ATTENDANCE_DEFAULT_WORKING_HOURS.schedules.weekday,
        ...(workingHours.shifts?.morning || {}),
        ...(workingHours.schedules?.weekday || {}),
      },
      saturday: {
        ...ATTENDANCE_DEFAULT_WORKING_HOURS.schedules.saturday,
        ...(workingHours.schedules?.saturday || {}),
      },
    },
    workDays: Array.isArray(workingHours.workDays)
      ? workingHours.workDays
      : ATTENDANCE_DEFAULT_WORKING_HOURS.workDays,
  };
}

function attendanceMetrics({ workingHours, checkInAt, checkOutAt }) {
  const referenceDate = new Date(checkInAt || checkOutAt || Date.now());
  const settings = safeWorkingHours(workingHours);
  const englishWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    weekday: "long",
  }).format(referenceDate);
  const workDay = ATTENDANCE_WEEKDAYS[englishWeekday];
  const scheduleKey = englishWeekday === "Saturday" ? "saturday" : "weekday";
  const schedule = settings.schedules[scheduleKey];
  const isWorkingDay = settings.workDays.includes(workDay);
  const checkInMinutes = checkInAt ? cambodiaMinutes(checkInAt) : null;
  const checkOutMinutes = checkOutAt ? cambodiaMinutes(checkOutAt) : null;
  const startMinutes = minutesFromTime(schedule.start);
  const endMinutes = minutesFromTime(schedule.end);
  const graceMinutes = Math.max(0, Number.parseInt(schedule.grace, 10) || 0);
  const lateMinutes = isWorkingDay && checkInMinutes !== null && startMinutes !== null
    ? Math.max(0, checkInMinutes - startMinutes - graceMinutes)
    : 0;
  const earlyLeaveMinutes = isWorkingDay && checkOutMinutes !== null && endMinutes !== null
    ? Math.max(0, endMinutes - checkOutMinutes)
    : 0;
  const durationMinutes = checkInAt && checkOutAt
    ? Math.max(0, Math.floor((new Date(checkOutAt) - new Date(checkInAt)) / 60_000))
    : null;

  return {
    shift: scheduleKey === "saturday" ? "កន្លះថ្ងៃ" : "ពេញម៉ោង",
    scheduleType: scheduleKey,
    scheduleLabel: scheduleKey === "saturday" ? "សៅរ៍ កន្លះថ្ងៃ" : "ចន្ទ–សុក្រ ពេញមួយថ្ងៃ",
    scheduledStart: schedule.start,
    scheduledEnd: schedule.end,
    graceMinutes,
    workDay,
    isWorkingDay,
    lateMinutes,
    earlyLeaveMinutes,
    isLate: lateMinutes > 0,
    isEarlyLeave: earlyLeaveMinutes > 0,
    status: lateMinutes > 0 ? "យឺត" : "មានវត្តមាន",
    hours: durationMinutes === null
      ? "កំពុងធ្វើការ"
      : `${Math.floor(durationMinutes / 60)} ម៉ោង ${durationMinutes % 60} នាទី`,
  };
}

function distanceInMeters(from, to) {
  if (!from || !to
    || !Number.isFinite(Number(from.latitude))
    || !Number.isFinite(Number(from.longitude))
    || !Number.isFinite(Number(to.latitude))
    || !Number.isFinite(Number(to.longitude))) return null;
  const earthRadius = 6_371_000;
  const lat1 = Number(from.latitude) * Math.PI / 180;
  const lat2 = Number(to.latitude) * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (Number(to.longitude) - Number(from.longitude)) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function withoutDocumentMetadata(document) {
  if (!document) return { data: null, updateTime: "" };
  const { __updateTime, ...data } = document;
  return { data, updateTime: __updateTime || "" };
}

async function resolveAttendanceBranch(env, branchId, branchName) {
  let branch = branchId ? await getDocument(env, `branches/${branchId}`) : null;
  if (!branch && branchName) {
    const branches = await listDocuments(env, "branches");
    branch = branches.find((item) => String(item.name || "") === String(branchName || "")) || null;
  }
  if (!branch) throw httpError("រកមិនឃើញសាខាដែលបានកំណត់", 403);
  if (String(branch.status || "") === "អសកម្ម") throw httpError("សាខានេះត្រូវបានដាក់អសកម្ម", 403);
  return branch;
}

function employeeBelongsToBranch(employee, branch) {
  if (employee.branchId && branch.id) return String(employee.branchId) === String(branch.id);
  return String(employee.branch || "") === String(branch.name || "");
}

async function validateAttendanceLocation(env, branch, rawLocation) {
  const settings = await getDocument(env, "settings/gpsQrPublic");
  if (!settings) throw httpError("GPS/QR មិនទាន់បានកំណត់សុវត្ថិភាព។ សូមទាក់ទង HR", 503);
  const savedGeofence = settings.branchGeofences?.[branch.id] || {};
  const radius = Number(
    branch.gpsRadiusMeters
      || savedGeofence.radiusMeters
      || settings.radii?.[branch.id]
      || 100,
  );

  if (!settings.requireGps) {
    return {
      settings,
      location: {
        gpsStatus: "not-required",
        verifiedBranchId: branch.id,
        verifiedBranchName: branch.name,
        allowedRadiusMeters: radius,
      },
    };
  }

  const location = rawLocation && typeof rawLocation === "object" ? rawLocation : {};
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy = Number(location.accuracy);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw httpError("សូមអនុញ្ញាត GPS មុនពេលកត់ត្រាវត្តមាន", 400);
  }
  const maxAccuracy = Number(settings.maxGpsAccuracy || 100);
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > maxAccuracy) {
    throw httpError(`GPS មិនទាន់ច្បាស់ (${Number.isFinite(accuracy) ? accuracy : "—"}m)`, 400);
  }

  const branchLocation = {
    latitude: configuredAttendanceValue(
      branch.latitude,
      configuredAttendanceValue(savedGeofence.latitude, settings.locations?.[branch.id]?.latitude ?? ""),
    ),
    longitude: configuredAttendanceValue(
      branch.longitude,
      configuredAttendanceValue(savedGeofence.longitude, settings.locations?.[branch.id]?.longitude ?? ""),
    ),
  };
  if (!Number.isFinite(Number(branchLocation.latitude)) || !Number.isFinite(Number(branchLocation.longitude))) {
    throw httpError("សាខានេះមិនទាន់កំណត់ Latitude/Longitude", 503);
  }

  const meters = distanceInMeters({ latitude, longitude }, branchLocation);
  if (meters === null || meters > radius) {
    throw httpError(`អ្នកស្ថិតនៅក្រៅតំបន់សាខា (${meters ?? "—"}m / ${radius}m)`, 403);
  }

  return {
    settings,
    location: {
      gpsStatus: "recorded",
      latitude,
      longitude,
      accuracy: Math.round(accuracy),
      capturedAt: new Date().toISOString(),
      clientCapturedAt: String(location.capturedAt || ""),
      distanceMeters: meters,
      allowedRadiusMeters: radius,
      verifiedBranchId: branch.id,
      verifiedBranchName: branch.name,
    },
  };
}

async function validateEmployeeQr(env, settings, branch, rawPayload, forceValidation = false) {
  if (!settings.requireQr && !forceValidation) return null;
  const payloadText = String(rawPayload || "").trim();
  if (!payloadText || payloadText.length > 2048) throw httpError("សូមស្កេន QR code របស់សាខា", 400);
  let payload;
  try { payload = JSON.parse(payloadText); } catch { throw httpError("QR code មិនត្រឹមត្រូវ", 400); }
  if (payload.type !== "BORRIBO_ATTENDANCE" || payload.version !== 1
    || String(payload.branchId || "") !== String(branch.id)
    || !payload.token || !payload.expiresAt) {
    throw httpError("QR code មិនត្រឹមត្រូវ ឬមិនមែនរបស់សាខានេះទេ", 400);
  }
  const token = await getDocument(env, `qrTokens/${branch.id}`);
  if (!token) throw httpError("QR សាខានេះមិនទាន់ត្រូវបានដំណើរការ", 503);
  if (String(token.expiresAt || "") !== String(payload.expiresAt)
    || new Date(token.expiresAt).getTime() <= Date.now()) {
    throw httpError("QR code បានផុតកំណត់។ សូមស្កេន QR ថ្មី", 400);
  }
  if (await hashKey(String(payload.token)) !== String(token.tokenHash || "")) {
    throw httpError("QR code មិនត្រឹមត្រូវ ឬត្រូវបានប្ដូររួចហើយ", 400);
  }
  return { branchId: branch.id, expiresAt: token.expiresAt, version: token.version || 1 };
}

async function loadWorkingHours(env) {
  return await getDocument(env, "settings/workingHours") || ATTENDANCE_DEFAULT_WORKING_HOURS;
}

const KIOSK_PIN_WINDOW_MS = 5 * 60 * 1000;
const KIOSK_PIN_LOCK_MS = 15 * 60 * 1000;
const KIOSK_PIN_MAX_FAILURES = 5;

function kioskAttemptPath(user) {
  return `kioskPinAttempts/${user.uid}`;
}

async function assertKioskPinAllowed(user, env) {
  const attempt = await getDocument(env, kioskAttemptPath(user));
  const lockedUntil = attempt?.lockedUntil ? new Date(attempt.lockedUntil).getTime() : 0;
  if (lockedUntil > Date.now()) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000));
    throw httpError(`បញ្ចូល PIN ខុសច្រើនដង។ សូមសាកម្ដងទៀតក្រោយ ${minutes} នាទី`, 429);
  }
}

async function registerKioskPinFailure(user, env) {
  const path = kioskAttemptPath(user);
  for (let attemptNo = 0; attemptNo < 4; attemptNo += 1) {
    const snapshot = await getDocumentWithMetadata(env, path);
    const state = withoutDocumentMetadata(snapshot);
    const now = Date.now();
    const previousWindow = state.data?.windowStartedAt ? new Date(state.data.windowStartedAt).getTime() : 0;
    const insideWindow = Number.isFinite(previousWindow) && now - previousWindow < KIOSK_PIN_WINDOW_MS;
    const failedAttempts = insideWindow ? Number(state.data?.failedAttempts || 0) + 1 : 1;
    const data = {
      failedAttempts,
      windowStartedAt: insideWindow ? state.data.windowStartedAt : new Date(now).toISOString(),
      lastFailedAt: new Date(now).toISOString(),
      lockedUntil: failedAttempts >= KIOSK_PIN_MAX_FAILURES
        ? new Date(now + KIOSK_PIN_LOCK_MS).toISOString()
        : "",
    };
    try {
      await commitWrites(env, [{
        path,
        data,
        ...(state.updateTime ? { updateTime: state.updateTime } : { exists: false }),
      }]);
      return data;
    } catch (error) {
      if (attemptNo === 3) throw httpError("មិនអាចផ្ទៀងផ្ទាត់ PIN នៅពេលនេះបានទេ", 503);
    }
  }
  throw httpError("មិនអាចផ្ទៀងផ្ទាត់ PIN នៅពេលនេះបានទេ", 503);
}

async function clearKioskPinFailures(user, env) {
  await deleteDocument(env, kioskAttemptPath(user)).catch(() => {});
}

async function employeeForAuthenticatedUser(user, env) {
  if (user.role !== "employee") throw httpError("Employee account is required", 403);
  if (!user.employeeId) throw httpError("គណនីនេះមិនទាន់ភ្ជាប់លេខសម្គាល់បុគ្គលិក", 403);
  const employee = await getDocument(env, `employees/${user.employeeId}`);
  if (!employee) throw httpError("រកមិនឃើញទិន្នន័យបុគ្គលិក", 404);
  if (employee.uid && String(employee.uid) !== String(user.uid)) throw httpError("Employee account link មិនត្រឹមត្រូវ", 403);
  if (normalizeEmployeeStatus(employee.status) === "អសកម្ម") throw httpError("គណនីបុគ្គលិកនេះអសកម្ម", 403);
  return employee;
}

async function kioskEmployeeForPin(user, env, rawPin) {
  if (user.role !== "kiosk") throw httpError("Kiosk account is required", 403);
  await assertKioskPinAllowed(user, env);
  const pin = String(rawPin || "");
  if (!/^\d{4}$/.test(pin)) {
    await registerKioskPinFailure(user, env);
    throw httpError("លេខកូដមិនត្រឹមត្រូវ", 400);
  }
  const branch = await resolveAttendanceBranch(env, user.branchId, user.branch);
  const employees = await listDocuments(env, "employees");
  const matches = employees.filter((employee) => (
    String(employee.pin ?? "") === pin
    && normalizeEmployeeStatus(employee.status, "សកម្ម") !== "អសកម្ម"
    && employeeBelongsToBranch(employee, branch)
  ));
  if (matches.length !== 1) {
    if (matches.length > 1) console.error("Duplicate kiosk PIN detected", { kioskUid: user.uid, branchId: branch.id });
    const failure = await registerKioskPinFailure(user, env);
    if (failure.lockedUntil) throw httpError("បញ្ចូល PIN ខុសច្រើនដង។ Kiosk ត្រូវបានចាក់សោ 15 នាទី", 429);
    throw httpError("លេខកូដមិនត្រឹមត្រូវ ឬបុគ្គលិកមិនស្ថិតក្នុងសាខានេះ", 401);
  }
  await clearKioskPinFailures(user, env);
  return { employee: matches[0], branch };
}

function publicKioskEmployee(employee) {
  return {
    id: employee.id,
    name: employee.name || employee.id,
    role: employee.role || employee.jobRole || "បុគ្គលិក",
    branch: employee.branch || "",
    branchId: employee.branchId || "",
  };
}

async function saveTrustedAttendance({ user, env, employee, branch, action, source, location, qr }) {
  const now = new Date();
  const nowISO = now.toISOString();
  const dateISO = attendanceDateISO(now);
  const recordId = `${employee.id}_${dateISO}`;
  const [todayDocument, historyDocument, workingHours] = await Promise.all([
    getDocumentWithMetadata(env, `attendanceToday/${recordId}`),
    getDocumentWithMetadata(env, `attendanceHistory/${recordId}`),
    loadWorkingHours(env),
  ]);
  const todayState = withoutDocumentMetadata(todayDocument);
  const historyState = withoutDocumentMetadata(historyDocument);
  const existing = todayState.data;

  if (action === "in" && existing?.checkIn && existing.checkIn !== "—") {
    throw httpError(`បាន Check-in រួចហើយនៅម៉ោង ${existing.checkIn}`, 409);
  }
  if (action === "out" && (!existing?.checkIn || existing.checkIn === "—")) {
    throw httpError("មិនទាន់មាន Check-in សម្រាប់ថ្ងៃនេះ", 409);
  }
  if (action === "out" && existing?.checkOut && existing.checkOut !== "—") {
    throw httpError(`បាន Check-out រួចហើយនៅម៉ោង ${existing.checkOut}`, 409);
  }

  const identity = {
    id: employee.id,
    uid: employee.uid || (source === "mobile" ? user.uid : ""),
    recordId,
    dateISO,
    date: attendanceDateLabel(dateISO),
    name: employee.name || employee.id,
    role: employee.role || employee.jobRole || "បុគ្គលិក",
    branch: branch.name || employee.branch || "",
    branchId: branch.id || employee.branchId || "",
    source,
    updatedAt: nowISO,
  };

  let record;
  if (action === "in") {
    const metrics = attendanceMetrics({ workingHours, checkInAt: nowISO });
    record = {
      ...identity,
      checkIn: attendanceTimeLabel(now),
      checkInAt: nowISO,
      checkInClientAt: nowISO,
      checkInLocation: location,
      checkOut: "—",
      gpsStatus: location.gpsStatus,
      gpsVerified: location.gpsStatus === "recorded",
      qrVerified: Boolean(qr),
      qrBranchId: qr?.branchId || "",
      qrExpiresAt: qr?.expiresAt || "",
      ...metrics,
    };
  } else {
    const checkInAt = existing.checkInClientAt || existing.checkInAt;
    const metrics = attendanceMetrics({ workingHours, checkInAt, checkOutAt: nowISO });
    record = {
      ...existing,
      ...identity,
      checkOut: attendanceTimeLabel(now),
      checkOutAt: nowISO,
      checkOutClientAt: nowISO,
      checkOutLocation: location,
      gpsStatus: location.gpsStatus,
      gpsVerified: location.gpsStatus === "recorded",
      qrVerified: Boolean(qr),
      qrBranchId: qr?.branchId || "",
      qrExpiresAt: qr?.expiresAt || "",
      ...metrics,
    };
  }

  const historyRecord = { ...record, docId: recordId };
  await commitWrites(env, [
    {
      path: `attendanceToday/${recordId}`,
      data: record,
      ...(todayState.updateTime ? { updateTime: todayState.updateTime } : { exists: false }),
    },
    {
      path: `attendanceHistory/${recordId}`,
      data: historyRecord,
      ...(historyState.updateTime ? { updateTime: historyState.updateTime } : { exists: false }),
    },
  ]);

  const telegramType = action === "in" ? "check_in" : "check_out";
  const telegram = await handleEvent(user, env, { type: telegramType, recordId })
    .catch((error) => ({ ok: false, error: error.message }));
  return { record, telegram };
}

async function handleEmployeeQrValidation(user, env, body) {
  const employee = await employeeForAuthenticatedUser(user, env);
  const branch = await resolveAttendanceBranch(env, employee.branchId || user.branchId, employee.branch || user.branch);
  if (!employeeBelongsToBranch(employee, branch)) throw httpError("បុគ្គលិកមិនស្ថិតក្នុងសាខាដែលបានកំណត់", 403);
  const settings = await getDocument(env, "settings/gpsQrPublic");
  if (!settings) throw httpError("GPS/QR មិនទាន់បានកំណត់សុវត្ថិភាព។ សូមទាក់ទង HR", 503);
  const qr = await validateEmployeeQr(env, settings, branch, body.qrPayload, true);
  return {
    ok: true,
    valid: true,
    branch: { id: branch.id, name: branch.name },
    expiresAt: qr.expiresAt,
    message: `QR ត្រឹមត្រូវសម្រាប់សាខា ${branch.name || branch.id}`,
  };
}

async function handleEmployeeAttendance(user, env, body) {
  const action = normalizeAttendanceAction(body.action);
  const employee = await employeeForAuthenticatedUser(user, env);
  const branch = await resolveAttendanceBranch(env, employee.branchId || user.branchId, employee.branch || user.branch);
  if (!employeeBelongsToBranch(employee, branch)) throw httpError("បុគ្គលិកមិនស្ថិតក្នុងសាខាដែលបានកំណត់", 403);
  const validation = await validateAttendanceLocation(env, branch, body.location);
  const qr = await validateEmployeeQr(env, validation.settings, branch, body.qrPayload);
  const result = await saveTrustedAttendance({
    user,
    env,
    employee,
    branch,
    action,
    source: "mobile",
    location: validation.location,
    qr,
  });
  return {
    ok: true,
    ...result,
    requireQr: Boolean(validation.settings.requireQr),
    message: action === "in"
      ? `Check-in ជោគជ័យ នៅម៉ោង ${result.record.checkIn}${result.record.isLate ? ` · មកយឺត ${result.record.lateMinutes} នាទី` : ""}`
      : `Check-out ជោគជ័យ នៅម៉ោង ${result.record.checkOut}${result.record.isEarlyLeave ? ` · ចេញមុន ${result.record.earlyLeaveMinutes} នាទី` : ""}`,
  };
}

async function handleKioskLookup(user, env, body) {
  const { employee, branch } = await kioskEmployeeForPin(user, env, body.pin);
  const dateISO = attendanceDateISO();
  const attendance = await getDocument(env, `attendanceToday/${employee.id}_${dateISO}`);
  const { data } = withoutDocumentMetadata(attendance);
  return {
    ok: true,
    employee: publicKioskEmployee(employee),
    attendance: data,
    branch: { id: branch.id, name: branch.name },
  };
}

async function handleKioskAttendance(user, env, body) {
  const action = normalizeAttendanceAction(body.action);
  const { employee, branch } = await kioskEmployeeForPin(user, env, body.pin);
  const validation = await validateAttendanceLocation(env, branch, body.location);
  const result = await saveTrustedAttendance({
    user,
    env,
    employee,
    branch,
    action,
    source: "kiosk",
    location: validation.location,
    qr: null,
  });
  return {
    ok: true,
    ...result,
    employee: publicKioskEmployee(employee),
    message: action === "in"
      ? `Check-in ជោគជ័យ នៅម៉ោង ${result.record.checkIn}`
      : `Check-out ជោគជ័យ នៅម៉ោង ${result.record.checkOut}`,
  };
}


async function handleTest(user, env) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const settings = await loadTelegramSettings(env);
  if (!settings.chatId) throw Object.assign(new Error("Telegram Chat ID is not configured"), { status: 400 });
  const senderEmail = String(user.email || "").replace(/@borribo\.com$/i, "@borribo.com.kh");
  const message = `✅ <b>Borribo HRMS</b>\nTelegram Bot ភ្ជាប់បានជោគជ័យ\nផ្ញើដោយ: ${escapeHtml(senderEmail)}`;
  const sent = await sendTelegram(env, settings.chatId, message);
  const id = `TG-${Date.now()}`;
  await logTelegramEvent(env, id, { chatId: settings.chatId, type: "test", message: message.replace(/<[^>]+>/g, ""), status: "បានផ្ញើ", telegramMessageId: sent.message_id, actorUid: user.uid });
  return { ok: true, messageId: sent.message_id };
}

async function handleSystemStatus(user, env) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  await checkFirestoreBackupOperation(env).catch((error) => console.error("Backup status refresh failed", error.message));
  const settings = await loadSystemSettings(env);
  return {
    ok: true,
    emailConfigured: Boolean(env.RESEND_API_KEY && env.NOTIFICATION_FROM_EMAIL),
    backupConfigured: Boolean(env.FIRESTORE_BACKUP_BUCKET),
    settings: {
      emailNotif: settings.emailNotif,
      autoBackup: settings.autoBackup,
      backupFreq: settings.backupFreq,
      lastBackupAt: settings.lastBackupAt || "",
      lastBackupCompletedAt: settings.lastBackupCompletedAt || "",
      lastBackupStatus: settings.lastBackupStatus || "never",
      lastBackupError: settings.lastBackupError || "",
      lastBackupOperation: settings.lastBackupOperation || "",
      lastBackupOutput: settings.lastBackupOutput || "",
    },
  };
}

async function handleSystemBackup(user, env) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  return startFirestoreBackup(env, true);
}

async function handleSystemTestEmail(user, env) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  if (!user.email) throw Object.assign(new Error("Your account does not have an email address"), { status: 400 });
  const result = await sendEmail(env, {
    to: [user.email],
    subject: "Borribo HRMS: Email notification test",
    text: `Borribo HRMS email notifications are working.\n\nSent at: ${new Date().toISOString()}`,
  });
  const id = `EMAIL-TEST-${Date.now()}`;
  await putDocument(env, `emailOutbox/${id}`, {
    id,
    type: "test",
    recipients: [String(user.email).toLowerCase()],
    subject: "Borribo HRMS: Email notification test",
    message: "Borribo HRMS email notifications are working.",
    status: "បានផ្ញើ",
    providerMessageId: result.id,
    actorUid: user.uid,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, messageId: result.id };
}

async function deliverTelegramEvent(user, env, body, row, config, text, state) {
  const settings = await loadTelegramSettings(env);
  if (!settings.enabled || !settings.chatId) return { ok: true, skipped: true, reason: "disabled" };
  const lateCheckIn = body.type === "check_in" && Number(row.lateMinutes || 0) > 0;
  const eventEnabled = lateCheckIn
    ? Boolean(settings.onCheckIn || settings.onLate)
    : Boolean(settings[config.option]);
  if (!eventEnabled) return { ok: true, skipped: true, reason: "event-disabled" };
  const id = await hashKey(`${body.type}:${body.recordId}:${state}`);
  if (await getDocument(env, `telegramEvents/${id}`)) return { ok: true, skipped: true, reason: "duplicate" };
  try {
    const sent = await sendTelegram(env, settings.chatId, text);
    await putDocument(env, `telegramEvents/${id}`, {
      id,
      type: body.type,
      recordId: body.recordId,
      status: "sent",
      sentAt: new Date().toISOString(),
      telegramMessageId: sent.message_id,
    });
    await logTelegramEvent(env, id, {
      chatId: settings.chatId,
      type: body.type,
      message: plainNotificationText(text),
      status: "បានផ្ញើ",
      telegramMessageId: sent.message_id,
      actorUid: user.uid,
      recordId: body.recordId,
    });
    return { ok: true, messageId: sent.message_id };
  } catch (error) {
    await logTelegramEvent(env, id, {
      chatId: settings.chatId,
      type: body.type,
      message: plainNotificationText(text),
      status: "ផ្ញើបរាជ័យ",
      error: error.message,
      actorUid: user.uid,
      recordId: body.recordId,
    }).catch(() => {});
    throw error;
  }
}

async function handleEvent(user, env, body) {
  const config = eventConfig(body.type);
  if (!config || !body.recordId) throw Object.assign(new Error("Invalid notification event"), { status: 400 });
  if (body.type === "leave_decision" && !manager(user)) {
    throw Object.assign(new Error("Only Admin/HR can send leave decisions"), { status: 403 });
  }
  const row = await getDocument(env, `${config.collection}/${body.recordId}`);
  if (!row) throw Object.assign(new Error("Event record was not found"), { status: 404 });
  const ownerUid = row.uid || row.employeeUid || "";
  if (!manager(user) && user.role !== "kiosk" && ownerUid !== user.uid) {
    throw Object.assign(new Error("You cannot notify for another employee"), { status: 403 });
  }

  const state = body.type === "leave_decision"
    ? row.status
    : body.type === "check_out"
      ? row.checkOut
      : body.type === "check_in"
        ? row.checkIn
        : row.requestedOn || row.startDate;
  const text = eventMessage(body.type, row);
  const [telegram, email] = await Promise.all([
    deliverTelegramEvent(user, env, body, row, config, text, state)
      .catch((error) => ({ ok: false, error: error.message })),
    deliverEventEmail(user, env, body, row, text, state)
      .catch((error) => ({ ok: false, error: error.message })),
  ]);
  return { ok: true, telegram, email };
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
  const activeEmployees = employees.filter((row) => normalizeEmployeeStatus(row.status, "សកម្ម") !== "អសកម្ម");
  const presentIds = new Set(attendance.filter((row) => row.checkIn && row.checkIn !== "—").map((row) => row.id));
  const onLeaveIds = new Set(approvedLeaves.filter((row) => row.startDate <= dateISO && row.endDate >= dateISO).map((row) => row.employeeId || row.empId));
  const late = attendance.filter((row) => Number(row.lateMinutes || 0) > 0 || row.status === "យឺត").length;
  const present = presentIds.size;
  const absent = activeEmployees.filter((row) => !presentIds.has(row.id) && !onLeaveIds.has(row.id)).length;
  const message = `📊 <b>របាយការណ៍វត្តមានប្រចាំថ្ងៃ</b>\n📅 ${dateISO}\n\n👥 បុគ្គលិកសរុប: ${activeEmployees.length}\n🟢 មានវត្តមាន: ${present}\n🟠 មកយឺត: ${late}\n🏖 សុំច្បាប់: ${onLeaveIds.size}\n🔴 អវត្តមាន: ${absent}`;
  const sent = await sendTelegram(env, settings.chatId, message);
  await putDocument(env, `telegramEvents/${id}`, { id, type: "daily_summary", dateISO, status: "sent", sentAt: new Date().toISOString(), telegramMessageId: sent.message_id });
  await logTelegramEvent(env, id, { chatId: settings.chatId, type: "daily_summary", message: message.replace(/<[^>]+>/g, ""), status: "បានផ្ញើ", telegramMessageId: sent.message_id });
  return { ok: true, messageId: sent.message_id };
}

const LOAN_STATUSES = new Set(["រង់ចាំអនុម័ត", "សកម្ម", "បានសងរួច", "បដិសេធ", "បានលុបចោល"]);
const ASSET_STATUSES = new Set(["កំពុងប្រើ", "នៅស្តុក", "ជួសជុល", "បាត់/លុបចេញ"]);
const ASSET_APPROVAL_STATUSES = new Set(["ព្រាង", "រង់ចាំអនុម័ត", "បានអនុម័ត", "ត្រូវកែប្រែ"]);
const KPI_STATUSES = new Set(["ព្រាង", "រង់ចាំអនុម័ត", "បានអនុម័ត", "ត្រូវកែប្រែ"]);
const KPI_CYCLES = new Set(["monthly", "quarterly", "yearly"]);

function requireManager(user) {
  if (!manager(user)) throw httpError("Admin or HR role is required", 403);
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function requiredText(value, label, maxLength = 200) {
  const result = cleanText(value, maxLength);
  if (!result) throw httpError(`${label} is required`, 400);
  return result;
}

function finiteNumber(value, label, { min = 0, max = 1_000_000_000 } = {}) {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw httpError(`${label} is invalid`, 400);
  return Math.round(result * 100) / 100;
}

function validIsoDate(value, label, allowMonth = false) {
  const result = cleanText(value, 10);
  const pattern = allowMonth ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(result)) throw httpError(`${label} is invalid`, 400);
  return result;
}

function operationActor(user) {
  return { uid: user.uid || "", email: user.email || "System" };
}

function operationHistory(user, type, label, detail = {}) {
  return {
    id: `HIS-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    label,
    at: new Date().toISOString(),
    actorUid: user.uid || "",
    actorEmail: user.email || "System",
    detail,
  };
}

function appendOperationHistory(current, entry, limit = 200) {
  return [...(Array.isArray(current) ? current : []), entry].slice(-limit);
}

function sanitizeLoanAttachments(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw httpError("Loan attachments are invalid", 400);
  if (value.length > 10) throw httpError("A loan can contain at most 10 attachments", 400);
  const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  return value.map((item) => {
    const path = requiredText(item?.path, "Attachment path", 500);
    if (!path.startsWith("loanAttachments/")) throw httpError("Loan attachment path is invalid", 400);
    const type = requiredText(item?.type, "Attachment type", 100);
    if (!allowedTypes.has(type)) throw httpError("Loan attachment type is invalid", 400);
    const size = finiteNumber(item?.size || 0, "Attachment size", { min: 1, max: 5 * 1024 * 1024 });
    return {
      path,
      name: requiredText(item?.name, "Attachment name", 255),
      type,
      size,
      uploadedAt: cleanText(item?.uploadedAt, 40) || new Date().toISOString(),
      uploadedByUid: cleanText(item?.uploadedByUid, 128),
      uploadedByEmail: cleanText(item?.uploadedByEmail, 255),
    };
  });
}

function assetFinancialFields(input = {}, fallback = {}) {
  const value = input.value === undefined ? Number(fallback.value || 0) : finiteNumber(input.value || 0, "Asset value", { min: 0, max: 1_000_000_000 });
  const usefulLifeYears = input.usefulLifeYears === undefined
    ? Number(fallback.usefulLifeYears || 0)
    : finiteNumber(input.usefulLifeYears || 0, "Useful life", { min: 0, max: 100 });
  const salvageValue = input.salvageValue === undefined
    ? Number(fallback.salvageValue || 0)
    : finiteNumber(input.salvageValue || 0, "Salvage value", { min: 0, max: 1_000_000_000 });
  if (salvageValue > value) throw httpError("Salvage value cannot exceed asset value", 400);
  const annualDepreciation = usefulLifeYears > 0
    ? Math.round(((value - salvageValue) / usefulLifeYears) * 100) / 100
    : 0;
  return { value, usefulLifeYears, salvageValue, depreciationMethod: usefulLifeYears > 0 ? "straight-line" : "none", annualDepreciation };
}

async function requiredEmployee(env, employeeId) {
  const id = requiredText(employeeId, "Employee", 80);
  const employee = await getDocument(env, `employees/${id}`);
  if (!employee) throw httpError("Employee was not found", 404);
  if (normalizeEmployeeStatus(employee.status, "សកម្ម") === "អសកម្ម") throw httpError("Employee is inactive", 409);
  return employee;
}

async function requiredOperationalDocument(env, collectionName, id, label) {
  const document = await getDocumentWithMetadata(env, `${collectionName}/${requiredText(id, label, 120)}`);
  if (!document) throw httpError(`${label} was not found`, 404);
  return withoutDocumentMetadata(document);
}

function operationalAuditWrite(type, user, record, extra = {}) {
  return auditLogWrite(type, user, {
    id: record.employeeId || record.assetId || record.kpiId || record.loanId || record.payrollId || record.id || "",
    name: record.employeeName || record.name || record.metric || record.assetCode || "",
    uid: "",
    email: "",
    accountRole: "",
  }, {
    module: extra.module || "operations",
    recordId: record.loanId || record.assetId || record.kpiId || record.payrollId || record.id || "",
    ...extra,
  });
}

async function handleLoanOperation(user, env, action, payload) {
  requireManager(user);
  const now = new Date().toISOString();

  if (action === "loan.create") {
    const input = payload?.loan || {};
    const employee = await requiredEmployee(env, input.employeeId);
    const amount = finiteNumber(input.amount, "Loan amount", { min: 0.01, max: 100_000_000 });
    const monthlyPayment = finiteNumber(input.monthlyPayment || 0, "Monthly payment", { min: 0, max: amount });
    const loanId = `LOAN-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const attachments = sanitizeLoanAttachments(input.attachments) || [];
    const history = operationHistory(user, "created", "បានបង្កើតសំណើកម្ចី", { amount, attachmentCount: attachments.length });
    const loan = {
      loanId,
      employeeId: employee.id,
      employeeName: employee.name || employee.id,
      branch: employee.branch || "",
      branchId: employee.branchId || "",
      amount,
      paidAmount: 0,
      balance: amount,
      monthlyPayment,
      startDate: validIsoDate(input.startDate, "Start date"),
      purpose: requiredText(input.purpose, "Purpose", 500),
      status: "រង់ចាំអនុម័ត",
      payments: [],
      attachments,
      history: [history],
      createdAt: now,
      createdByUid: user.uid || "",
      createdByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    await commitWrites(env, [
      { path: `staffLoans/${loanId}`, data: loan, exists: false },
      operationalAuditWrite("staff_loan_created", user, loan, { module: "staffLoans", amount }),
    ]);
    return { ok: true, loan };
  }

  const { data: loan, updateTime } = await requiredOperationalDocument(env, "staffLoans", payload?.loanId, "Loan");
  if (!LOAN_STATUSES.has(loan.status)) loan.status = Number(loan.paidAmount || 0) >= Number(loan.amount || 0) ? "បានសងរួច" : "សកម្ម";

  if (action === "loan.update") {
    if (["បានសងរួច", "បដិសេធ", "បានលុបចោល"].includes(loan.status)) throw httpError("Closed loans cannot be edited", 409);
    const patch = payload?.patch || {};
    const amount = patch.amount === undefined ? Number(loan.amount || 0) : finiteNumber(patch.amount, "Loan amount", { min: 0.01, max: 100_000_000 });
    const paidAmount = Number(loan.paidAmount || 0);
    if (amount < paidAmount) throw httpError("Loan amount cannot be below payments already recorded", 409);
    const monthlyPayment = patch.monthlyPayment === undefined
      ? Number(loan.monthlyPayment || 0)
      : finiteNumber(patch.monthlyPayment, "Monthly payment", { min: 0, max: amount });
    const attachments = patch.attachments === undefined
      ? (Array.isArray(loan.attachments) ? loan.attachments : [])
      : sanitizeLoanAttachments(patch.attachments);
    const next = {
      ...loan,
      amount,
      balance: Math.max(0, Math.round((amount - paidAmount) * 100) / 100),
      monthlyPayment,
      startDate: patch.startDate === undefined ? loan.startDate : validIsoDate(patch.startDate, "Start date"),
      purpose: patch.purpose === undefined ? loan.purpose : requiredText(patch.purpose, "Purpose", 500),
      attachments,
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(loan.history, operationHistory(user, "updated", "បានកែប្រែព័ត៌មានកម្ចី", { amount, monthlyPayment, attachmentCount: attachments.length }));
    await commitWrites(env, [
      { path: `staffLoans/${loan.loanId || payload.loanId}`, data: next, updateTime },
      operationalAuditWrite("staff_loan_updated", user, next, { module: "staffLoans" }),
    ]);
    return { ok: true, loan: next };
  }

  if (action === "loan.decide") {
    if (loan.status !== "រង់ចាំអនុម័ត") throw httpError("Only pending loans can be approved or rejected", 409);
    const decision = cleanText(payload?.decision, 20);
    if (!["approve", "reject"].includes(decision)) throw httpError("Decision is invalid", 400);
    const note = cleanText(payload?.note, 500);
    if (decision === "reject" && !note) throw httpError("A rejection reason is required", 400);
    const approved = decision === "approve";
    const next = {
      ...loan,
      status: approved ? "សកម្ម" : "បដិសេធ",
      decisionNote: note,
      decidedAt: now,
      decidedByUid: user.uid || "",
      decidedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(loan.history, operationHistory(
      user,
      approved ? "approved" : "rejected",
      approved ? "បានអនុម័តកម្ចី" : "បានបដិសេធកម្ចី",
      { note },
    ));
    await commitWrites(env, [
      { path: `staffLoans/${loan.loanId || payload.loanId}`, data: next, updateTime },
      operationalAuditWrite(approved ? "staff_loan_approved" : "staff_loan_rejected", user, next, { module: "staffLoans", note }),
    ]);
    return { ok: true, loan: next };
  }

  if (action === "loan.payment") {
    if (loan.status !== "សកម្ម") throw httpError("Payments can only be recorded for active loans", 409);
    const input = payload?.payment || {};
    const balance = Math.max(0, Number(loan.amount || 0) - Number(loan.paidAmount || 0));
    const amount = finiteNumber(input.amount, "Payment amount", { min: 0.01, max: balance });
    const payment = {
      paymentId: `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      date: validIsoDate(input.date, "Payment date"),
      amount,
      note: cleanText(input.note, 500),
      recordedAt: now,
      recordedByUid: user.uid || "",
      recordedByEmail: user.email || "",
    };
    const paidAmount = Math.round((Number(loan.paidAmount || 0) + amount) * 100) / 100;
    const nextBalance = Math.max(0, Math.round((Number(loan.amount || 0) - paidAmount) * 100) / 100);
    const next = {
      ...loan,
      payments: [...(Array.isArray(loan.payments) ? loan.payments : []), payment].slice(-500),
      paidAmount,
      balance: nextBalance,
      status: nextBalance === 0 ? "បានសងរួច" : "សកម្ម",
      completedAt: nextBalance === 0 ? now : loan.completedAt || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(loan.history, operationHistory(user, "payment", "បានកត់ត្រាការសងប្រាក់", { amount, balance: nextBalance }));
    await commitWrites(env, [
      { path: `staffLoans/${loan.loanId || payload.loanId}`, data: next, updateTime },
      operationalAuditWrite("staff_loan_payment_recorded", user, next, { module: "staffLoans", amount, balance: nextBalance }),
    ]);
    return { ok: true, loan: next, payment };
  }

  if (action === "loan.cancel") {
    if (["បានសងរួច", "បដិសេធ", "បានលុបចោល"].includes(loan.status)) throw httpError("This loan is already closed", 409);
    const reason = requiredText(payload?.reason, "Cancellation reason", 500);
    const next = {
      ...loan,
      status: "បានលុបចោល",
      cancellationReason: reason,
      cancelledAt: now,
      cancelledByUid: user.uid || "",
      cancelledByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(loan.history, operationHistory(user, "cancelled", "បានលុបចោលកម្ចី", { reason }));
    await commitWrites(env, [
      { path: `staffLoans/${loan.loanId || payload.loanId}`, data: next, updateTime },
      operationalAuditWrite("staff_loan_cancelled", user, next, { module: "staffLoans", reason }),
    ]);
    return { ok: true, loan: next };
  }

  throw httpError("Unsupported loan action", 404);
}

async function handleAssetOperation(user, env, action, payload) {
  requireManager(user);
  const now = new Date().toISOString();

  if (action === "asset.create") {
    const input = payload?.asset || {};
    const assetCode = requiredText(input.assetCode, "Asset code", 80).toUpperCase();
    const existingAssets = await listDocuments(env, "assets");
    if (existingAssets.some((item) => String(item.assetCode || "").toUpperCase() === assetCode)) throw httpError("Asset code already exists", 409);
    let employee = null;
    if (input.assignedTo) employee = await requiredEmployee(env, input.assignedTo);
    const assetId = `AST-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const status = employee ? "កំពុងប្រើ" : (ASSET_STATUSES.has(input.status) ? input.status : "នៅស្តុក");
    const requestedApprovalStatus = ASSET_APPROVAL_STATUSES.has(input.approvalStatus) ? input.approvalStatus : "រង់ចាំអនុម័ត";
    const approvalStatus = requestedApprovalStatus === "បានអនុម័ត" ? "រង់ចាំអនុម័ត" : requestedApprovalStatus;
    const financials = assetFinancialFields(input);
    const initialAssignment = employee ? [{
      transferId: `TRF-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      fromEmployeeId: "",
      fromEmployeeName: "",
      toEmployeeId: employee.id,
      toEmployeeName: employee.name || employee.id,
      date: validIsoDate(input.assignmentDate || new Date().toISOString().slice(0, 10), "Assignment date"),
      note: "Initial assignment",
      recordedAt: now,
      recordedByUid: user.uid || "",
      recordedByEmail: user.email || "",
    }] : [];
    const asset = {
      assetId,
      assetCode,
      name: requiredText(input.name, "Asset name", 200),
      category: requiredText(input.category || "ផ្សេងៗ", "Category", 100),
      assignedTo: employee?.id || "",
      assignedToName: employee?.name || "",
      assignedBranch: employee?.branch || "",
      status,
      purchaseDate: input.purchaseDate ? validIsoDate(input.purchaseDate, "Purchase date") : "",
      ...financials,
      serialNumber: cleanText(input.serialNumber, 160),
      note: cleanText(input.note, 1000),
      approvalStatus,
      managerComment: "",
      submittedAt: approvalStatus === "រង់ចាំអនុម័ត" ? now : "",
      submittedByUid: approvalStatus === "រង់ចាំអនុម័ត" ? user.uid || "" : "",
      submittedByEmail: approvalStatus === "រង់ចាំអនុម័ត" ? user.email || "" : "",
      assignmentHistory: initialAssignment,
      maintenanceHistory: [],
      history: [operationHistory(user, "created", approvalStatus === "រង់ចាំអនុម័ត" ? "បានបង្កើត និងដាក់ស្នើទ្រព្យសម្បត្តិ" : "បានបង្កើតទ្រព្យសម្បត្តិ", { assetCode, approvalStatus })],
      createdAt: now,
      createdByUid: user.uid || "",
      createdByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    await commitWrites(env, [
      { path: `assets/${assetId}`, data: asset, exists: false },
      operationalAuditWrite("asset_created", user, asset, { module: "assets", assetCode, approvalStatus }),
    ]);
    return { ok: true, asset };
  }

  const { data: asset, updateTime } = await requiredOperationalDocument(env, "assets", payload?.assetId, "Asset");
  if (!ASSET_APPROVAL_STATUSES.has(asset.approvalStatus)) asset.approvalStatus = "បានអនុម័ត";

  if (action === "asset.update") {
    if (asset.approvalStatus === "រង់ចាំអនុម័ត") throw httpError("Return the asset for changes before editing", 409);
    const patch = payload?.patch || {};
    const assetCode = patch.assetCode === undefined ? asset.assetCode : requiredText(patch.assetCode, "Asset code", 80).toUpperCase();
    if (assetCode !== String(asset.assetCode || "").toUpperCase()) {
      const existingAssets = await listDocuments(env, "assets");
      if (existingAssets.some((item) => item.id !== asset.assetId && String(item.assetCode || "").toUpperCase() === assetCode)) throw httpError("Asset code already exists", 409);
    }
    const status = patch.status === undefined ? asset.status : cleanText(patch.status, 40);
    if (!ASSET_STATUSES.has(status)) throw httpError("Asset status is invalid", 400);
    if (status === "នៅស្តុក" && asset.assignedTo) throw httpError("Transfer the asset back to stock before setting this status", 409);
    const financials = assetFinancialFields(patch, asset);
    const purchaseDate = patch.purchaseDate === undefined ? asset.purchaseDate : (patch.purchaseDate ? validIsoDate(patch.purchaseDate, "Purchase date") : "");
    const acquisitionChanged = assetCode !== String(asset.assetCode || "").toUpperCase()
      || (patch.name !== undefined && requiredText(patch.name, "Asset name", 200) !== asset.name)
      || (patch.category !== undefined && requiredText(patch.category, "Category", 100) !== asset.category)
      || purchaseDate !== (asset.purchaseDate || "")
      || financials.value !== Number(asset.value || 0)
      || financials.usefulLifeYears !== Number(asset.usefulLifeYears || 0)
      || financials.salvageValue !== Number(asset.salvageValue || 0);
    const approvalStatus = asset.approvalStatus === "បានអនុម័ត" && acquisitionChanged ? "រង់ចាំអនុម័ត" : (asset.approvalStatus === "ត្រូវកែប្រែ" ? "ព្រាង" : asset.approvalStatus);
    const next = {
      ...asset,
      assetCode,
      name: patch.name === undefined ? asset.name : requiredText(patch.name, "Asset name", 200),
      category: patch.category === undefined ? asset.category : requiredText(patch.category, "Category", 100),
      status,
      purchaseDate,
      ...financials,
      serialNumber: patch.serialNumber === undefined ? asset.serialNumber : cleanText(patch.serialNumber, 160),
      note: patch.note === undefined ? asset.note : cleanText(patch.note, 1000),
      approvalStatus,
      managerComment: approvalStatus === "រង់ចាំអនុម័ត" && asset.approvalStatus !== "រង់ចាំអនុម័ត" ? "" : asset.managerComment || "",
      submittedAt: approvalStatus === "រង់ចាំអនុម័ត" && asset.approvalStatus !== "រង់ចាំអនុម័ត" ? now : asset.submittedAt || "",
      submittedByUid: approvalStatus === "រង់ចាំអនុម័ត" && asset.approvalStatus !== "រង់ចាំអនុម័ត" ? user.uid || "" : asset.submittedByUid || "",
      submittedByEmail: approvalStatus === "រង់ចាំអនុម័ត" && asset.approvalStatus !== "រង់ចាំអនុម័ត" ? user.email || "" : asset.submittedByEmail || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(asset.history, operationHistory(user, "updated", acquisitionChanged && asset.approvalStatus === "បានអនុម័ត" ? "បានកែប្រែទិន្នន័យហិរញ្ញវត្ថុ និងដាក់ស្នើអនុម័តឡើងវិញ" : "បានកែប្រែព័ត៌មានទ្រព្យសម្បត្តិ", { status, approvalStatus }));
    await commitWrites(env, [
      { path: `assets/${asset.assetId || payload.assetId}`, data: next, updateTime },
      operationalAuditWrite("asset_updated", user, next, { module: "assets", status, approvalStatus }),
    ]);
    return { ok: true, asset: next };
  }

  if (action === "asset.submit") {
    if (!["ព្រាង", "ត្រូវកែប្រែ"].includes(asset.approvalStatus)) throw httpError("Only draft or returned assets can be submitted", 409);
    const next = {
      ...asset,
      approvalStatus: "រង់ចាំអនុម័ត",
      submittedAt: now,
      submittedByUid: user.uid || "",
      submittedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(asset.history, operationHistory(user, "submitted", "បានដាក់ទ្រព្យសម្បត្តិសម្រាប់អនុម័ត"));
    await commitWrites(env, [
      { path: `assets/${asset.assetId || payload.assetId}`, data: next, updateTime },
      operationalAuditWrite("asset_submitted", user, next, { module: "assets" }),
    ]);
    return { ok: true, asset: next };
  }

  if (action === "asset.review") {
    if (asset.approvalStatus !== "រង់ចាំអនុម័ត") throw httpError("Only submitted assets can be reviewed", 409);
    const decision = cleanText(payload?.decision, 20);
    if (!["approve", "return"].includes(decision)) throw httpError("Asset review decision is invalid", 400);
    const comment = cleanText(payload?.comment, 1000);
    if (decision === "return" && !comment) throw httpError("A comment is required when returning an asset", 400);
    const approved = decision === "approve";
    const next = {
      ...asset,
      approvalStatus: approved ? "បានអនុម័ត" : "ត្រូវកែប្រែ",
      managerComment: comment,
      reviewedAt: now,
      reviewedByUid: user.uid || "",
      reviewedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(asset.history, operationHistory(user, approved ? "approved" : "returned", approved ? "បានអនុម័តទ្រព្យសម្បត្តិ" : "បានបញ្ជូនទ្រព្យសម្បត្តិឱ្យកែប្រែ", { comment }));
    await commitWrites(env, [
      { path: `assets/${asset.assetId || payload.assetId}`, data: next, updateTime },
      operationalAuditWrite(approved ? "asset_approved" : "asset_returned", user, next, { module: "assets", comment }),
    ]);
    return { ok: true, asset: next };
  }

  if (action === "asset.transfer") {
    if (asset.approvalStatus !== "បានអនុម័ត") throw httpError("The asset must be approved before transfer", 409);
    if (asset.status === "បាត់/លុបចេញ") throw httpError("Retired or lost assets cannot be transferred", 409);
    const input = payload?.transfer || {};
    const toEmployeeId = cleanText(input.toEmployeeId, 80);
    const employee = toEmployeeId ? await requiredEmployee(env, toEmployeeId) : null;
    if (String(asset.assignedTo || "") === String(employee?.id || "")) throw httpError("The asset is already assigned to this employee", 409);
    const transfer = {
      transferId: `TRF-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      fromEmployeeId: asset.assignedTo || "",
      fromEmployeeName: asset.assignedToName || "",
      toEmployeeId: employee?.id || "",
      toEmployeeName: employee?.name || "",
      date: validIsoDate(input.date, "Transfer date"),
      note: cleanText(input.note, 500),
      recordedAt: now,
      recordedByUid: user.uid || "",
      recordedByEmail: user.email || "",
    };
    const next = {
      ...asset,
      assignedTo: employee?.id || "",
      assignedToName: employee?.name || "",
      assignedBranch: employee?.branch || "",
      status: employee ? "កំពុងប្រើ" : "នៅស្តុក",
      assignmentHistory: [...(Array.isArray(asset.assignmentHistory) ? asset.assignmentHistory : []), transfer].slice(-300),
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(asset.history, operationHistory(user, "transferred", employee ? "បានផ្ទេរទ្រព្យសម្បត្តិ" : "បានប្រគល់ទ្រព្យសម្បត្តិចូលស្តុក", { from: transfer.fromEmployeeName, to: transfer.toEmployeeName }));
    await commitWrites(env, [
      { path: `assets/${asset.assetId || payload.assetId}`, data: next, updateTime },
      operationalAuditWrite("asset_transferred", user, next, { module: "assets", fromEmployeeId: transfer.fromEmployeeId, toEmployeeId: transfer.toEmployeeId }),
    ]);
    return { ok: true, asset: next, transfer };
  }

  if (action === "asset.maintenance") {
    if (asset.approvalStatus !== "បានអនុម័ត") throw httpError("The asset must be approved before maintenance", 409);
    if (asset.status === "បាត់/លុបចេញ") throw httpError("Retired or lost assets cannot receive maintenance entries", 409);
    const input = payload?.maintenance || {};
    const maintenanceStatus = cleanText(input.status || "កំពុងជួសជុល", 40);
    if (!["កំពុងជួសជុល", "រួចរាល់"].includes(maintenanceStatus)) throw httpError("Maintenance status is invalid", 400);
    const maintenance = {
      maintenanceId: `MNT-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      date: validIsoDate(input.date, "Maintenance date"),
      type: requiredText(input.type, "Maintenance type", 160),
      cost: finiteNumber(input.cost || 0, "Maintenance cost", { min: 0, max: 1_000_000_000 }),
      vendor: cleanText(input.vendor, 200),
      note: cleanText(input.note, 1000),
      status: maintenanceStatus,
      recordedAt: now,
      recordedByUid: user.uid || "",
      recordedByEmail: user.email || "",
    };
    const nextStatus = maintenanceStatus === "កំពុងជួសជុល" ? "ជួសជុល" : (asset.assignedTo ? "កំពុងប្រើ" : "នៅស្តុក");
    const next = {
      ...asset,
      status: nextStatus,
      maintenanceHistory: [...(Array.isArray(asset.maintenanceHistory) ? asset.maintenanceHistory : []), maintenance].slice(-300),
      totalMaintenanceCost: Math.round((Number(asset.totalMaintenanceCost || 0) + maintenance.cost) * 100) / 100,
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(asset.history, operationHistory(user, "maintenance", "បានកត់ត្រាការជួសជុល", { type: maintenance.type, cost: maintenance.cost, status: maintenanceStatus }));
    await commitWrites(env, [
      { path: `assets/${asset.assetId || payload.assetId}`, data: next, updateTime },
      operationalAuditWrite("asset_maintenance_recorded", user, next, { module: "assets", cost: maintenance.cost, maintenanceStatus }),
    ]);
    return { ok: true, asset: next, maintenance };
  }

  throw httpError("Unsupported asset action", 404);
}

async function kpiWeightBucketState(env, employeeId, period, cycle) {
  const key = await hashKey(`kpi-weight:${employeeId}:${period}:${cycle}`);
  const path = `kpiWeightTotals/${key}`;
  const stored = await getDocumentWithMetadata(env, path);
  if (stored) {
    return {
      path,
      total: Number(stored.total || 0),
      updateTime: stored.__updateTime || "",
      exists: true,
    };
  }
  const records = await listDocuments(env, "kpis");
  const total = records
    .filter((item) => String(item.employeeId || "") === String(employeeId || "")
      && String(item.period || "") === String(period || "")
      && String(item.cycle || "monthly") === String(cycle || "monthly"))
    .reduce((sum, item) => sum + Number(item.weight || 100), 0);
  return { path, total: Math.round(total * 100) / 100, updateTime: "", exists: false };
}

function kpiWeightBucketWrite(state, employeeId, period, cycle, total) {
  const nextTotal = Math.round(total * 100) / 100;
  if (nextTotal < 0 || nextTotal > 100) throw httpError("Total KPI weight for this employee, period, and cycle cannot exceed 100%", 409);
  return {
    path: state.path,
    data: { employeeId, period, cycle, total: nextTotal, updatedAt: new Date().toISOString() },
    ...(state.exists ? { updateTime: state.updateTime } : { exists: false }),
  };
}

async function handleKpiOperation(user, env, action, payload) {
  requireManager(user);
  const now = new Date().toISOString();

  if (action === "kpi.create") {
    const input = payload?.kpi || {};
    const employee = await requiredEmployee(env, input.employeeId);
    const cycle = KPI_CYCLES.has(input.cycle) ? input.cycle : "monthly";
    const requestedStatus = KPI_STATUSES.has(input.status) ? input.status : "ព្រាង";
    const status = requestedStatus === "បានអនុម័ត" ? "រង់ចាំអនុម័ត" : requestedStatus;
    const kpiId = `KPI-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const target = finiteNumber(input.target, "Target", { min: 0.01, max: 1_000_000_000 });
    const actual = finiteNumber(input.actual || 0, "Actual", { min: 0, max: 1_000_000_000 });
    const weight = finiteNumber(input.weight || 100, "Weight", { min: 1, max: 100 });
    const period = validIsoDate(input.period, "KPI period", true);
    const weightState = await kpiWeightBucketState(env, employee.id, period, cycle);
    const weightWrite = kpiWeightBucketWrite(weightState, employee.id, period, cycle, weightState.total + weight);
    const kpi = {
      kpiId,
      employeeId: employee.id,
      employeeName: employee.name || employee.id,
      branch: employee.branch || "",
      branchId: employee.branchId || "",
      metric: requiredText(input.metric, "KPI metric", 300),
      target,
      actual,
      weight,
      period,
      cycle,
      note: cleanText(input.note, 1000),
      managerComment: "",
      status,
      submittedAt: status === "រង់ចាំអនុម័ត" ? now : "",
      submittedByUid: status === "រង់ចាំអនុម័ត" ? user.uid || "" : "",
      submittedByEmail: status === "រង់ចាំអនុម័ត" ? user.email || "" : "",
      history: [operationHistory(user, "created", status === "រង់ចាំអនុម័ត" ? "បានបង្កើត និងដាក់ស្នើ KPI" : "បានបង្កើត KPI", { target, weight })],
      createdAt: now,
      createdByUid: user.uid || "",
      createdByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    await commitWrites(env, [
      { path: `kpis/${kpiId}`, data: kpi, exists: false },
      weightWrite,
      operationalAuditWrite("kpi_created", user, kpi, { module: "kpis", status, weight }),
    ]);
    return { ok: true, kpi };
  }

  const { data: kpi, updateTime } = await requiredOperationalDocument(env, "kpis", payload?.kpiId, "KPI");

  if (action === "kpi.update") {
    if (kpi.status === "បានអនុម័ត") throw httpError("Approved KPIs cannot be edited", 409);
    if (kpi.status === "រង់ចាំអនុម័ត") throw httpError("Return the KPI for changes before editing", 409);
    const patch = payload?.patch || {};
    const cycle = patch.cycle === undefined ? (kpi.cycle || "monthly") : cleanText(patch.cycle, 20);
    if (!KPI_CYCLES.has(cycle)) throw httpError("KPI cycle is invalid", 400);
    const next = {
      ...kpi,
      metric: patch.metric === undefined ? kpi.metric : requiredText(patch.metric, "KPI metric", 300),
      target: patch.target === undefined ? Number(kpi.target || 0) : finiteNumber(patch.target, "Target", { min: 0.01, max: 1_000_000_000 }),
      actual: patch.actual === undefined ? Number(kpi.actual || 0) : finiteNumber(patch.actual, "Actual", { min: 0, max: 1_000_000_000 }),
      weight: patch.weight === undefined ? Number(kpi.weight || 100) : finiteNumber(patch.weight, "Weight", { min: 1, max: 100 }),
      period: patch.period === undefined ? kpi.period : validIsoDate(patch.period, "KPI period", true),
      cycle,
      note: patch.note === undefined ? kpi.note : cleanText(patch.note, 1000),
      status: kpi.status === "ត្រូវកែប្រែ" ? "ព្រាង" : (kpi.status || "ព្រាង"),
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    const oldPeriod = kpi.period;
    const oldCycle = kpi.cycle || "monthly";
    const oldWeight = Number(kpi.weight || 100);
    const oldState = await kpiWeightBucketState(env, kpi.employeeId, oldPeriod, oldCycle);
    const sameBucket = oldPeriod === next.period && oldCycle === next.cycle;
    const weightWrites = [];
    if (sameBucket) {
      weightWrites.push(kpiWeightBucketWrite(oldState, kpi.employeeId, next.period, next.cycle, oldState.total - oldWeight + next.weight));
    } else {
      const newState = await kpiWeightBucketState(env, kpi.employeeId, next.period, next.cycle);
      weightWrites.push(
        kpiWeightBucketWrite(oldState, kpi.employeeId, oldPeriod, oldCycle, oldState.total - oldWeight),
        kpiWeightBucketWrite(newState, kpi.employeeId, next.period, next.cycle, newState.total + next.weight),
      );
    }
    next.history = appendOperationHistory(kpi.history, operationHistory(user, "updated", "បានកែប្រែ KPI", { target: next.target, actual: next.actual, weight: next.weight }));
    await commitWrites(env, [
      { path: `kpis/${kpi.kpiId || payload.kpiId}`, data: next, updateTime },
      ...weightWrites,
      operationalAuditWrite("kpi_updated", user, next, { module: "kpis" }),
    ]);
    return { ok: true, kpi: next };
  }

  if (action === "kpi.submit") {
    if (!["ព្រាង", "ត្រូវកែប្រែ", ""].includes(kpi.status || "")) throw httpError("Only draft KPIs can be submitted", 409);
    const next = {
      ...kpi,
      status: "រង់ចាំអនុម័ត",
      submittedAt: now,
      submittedByUid: user.uid || "",
      submittedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(kpi.history, operationHistory(user, "submitted", "បានដាក់ KPI សម្រាប់អនុម័ត"));
    await commitWrites(env, [
      { path: `kpis/${kpi.kpiId || payload.kpiId}`, data: next, updateTime },
      operationalAuditWrite("kpi_submitted", user, next, { module: "kpis" }),
    ]);
    return { ok: true, kpi: next };
  }

  if (action === "kpi.review") {
    if (kpi.status !== "រង់ចាំអនុម័ត") throw httpError("Only submitted KPIs can be reviewed", 409);
    const decision = cleanText(payload?.decision, 20);
    if (!["approve", "return"].includes(decision)) throw httpError("Review decision is invalid", 400);
    const comment = cleanText(payload?.comment, 1000);
    if (decision === "return" && !comment) throw httpError("A comment is required when returning a KPI", 400);
    const approved = decision === "approve";
    const next = {
      ...kpi,
      status: approved ? "បានអនុម័ត" : "ត្រូវកែប្រែ",
      managerComment: comment,
      reviewedAt: now,
      reviewedByUid: user.uid || "",
      reviewedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(kpi.history, operationHistory(user, approved ? "approved" : "returned", approved ? "បានអនុម័ត KPI" : "បានបញ្ជូន KPI ឱ្យកែប្រែ", { comment }));
    await commitWrites(env, [
      { path: `kpis/${kpi.kpiId || payload.kpiId}`, data: next, updateTime },
      operationalAuditWrite(approved ? "kpi_approved" : "kpi_returned", user, next, { module: "kpis", comment }),
    ]);
    return { ok: true, kpi: next };
  }

  throw httpError("Unsupported KPI action", 404);
}

const PAYROLL_STATUSES = new Set(["ព្រាង", "រង់ចាំអនុម័ត", "បានអនុម័ត", "ត្រូវកែប្រែ", "បានបើកប្រាក់"]);

function payrollAmounts(input = {}, fallback = {}) {
  const baseSalary = input.baseSalary === undefined ? Number(fallback.baseSalary || 0) : finiteNumber(input.baseSalary, "Base salary", { min: 0.01, max: 1_000_000_000 });
  const allowances = input.allowances === undefined ? Number(fallback.allowances || 0) : finiteNumber(input.allowances || 0, "Allowances", { min: 0, max: 1_000_000_000 });
  const bonus = input.bonus === undefined ? Number(fallback.bonus || 0) : finiteNumber(input.bonus || 0, "Bonus", { min: 0, max: 1_000_000_000 });
  const overtime = input.overtime === undefined ? Number(fallback.overtime || 0) : finiteNumber(input.overtime || 0, "Overtime", { min: 0, max: 1_000_000_000 });
  const deductions = input.deductions === undefined ? Number(fallback.deductions || 0) : finiteNumber(input.deductions || 0, "Deductions", { min: 0, max: 1_000_000_000 });
  const tax = input.tax === undefined ? Number(fallback.tax || 0) : finiteNumber(input.tax || 0, "Tax", { min: 0, max: 1_000_000_000 });
  const loanDeduction = input.loanDeduction === undefined ? Number(fallback.loanDeduction || 0) : finiteNumber(input.loanDeduction || 0, "Loan deduction", { min: 0, max: 1_000_000_000 });
  const grossPay = Math.round((baseSalary + allowances + bonus + overtime) * 100) / 100;
  const netPay = Math.round((grossPay - deductions - tax - loanDeduction) * 100) / 100;
  if (netPay < 0) throw httpError("Payroll deductions cannot exceed gross pay", 400);
  return { baseSalary, allowances, bonus, overtime, deductions, tax, loanDeduction, grossPay, netPay };
}

async function validatePayrollLoan(env, employeeId, loanId, deduction, requireActive = true) {
  const normalizedLoanId = cleanText(loanId, 120);
  if (!deduction) return { loan: null, state: null };
  if (!normalizedLoanId) throw httpError("Select an active staff loan for the loan deduction", 400);
  const state = await requiredOperationalDocument(env, "staffLoans", normalizedLoanId, "Loan");
  const loan = state.data;
  if (String(loan.employeeId || "") !== String(employeeId || "")) throw httpError("The selected loan belongs to another employee", 409);
  const balance = Math.max(0, Number(loan.balance ?? (Number(loan.amount || 0) - Number(loan.paidAmount || 0))));
  const normalizedStatus = LOAN_STATUSES.has(loan.status) ? loan.status : (balance > 0 ? "សកម្ម" : "បានសងរួច");
  loan.status = normalizedStatus;
  if (requireActive && normalizedStatus !== "សកម្ម") throw httpError("The selected loan is not active", 409);
  if (deduction > balance) throw httpError("Loan deduction exceeds the outstanding loan balance", 409);
  return { loan, state };
}

async function handlePayrollOperation(user, env, action, payload) {
  requireManager(user);
  const now = new Date().toISOString();

  if (action === "payroll.create") {
    const input = payload?.payroll || {};
    const employee = await requiredEmployee(env, input.employeeId);
    const period = validIsoDate(input.period, "Payroll period", true);
    const payrollReservationId = await hashKey(`payroll:${employee.id}:${period}`);
    const payrollReservationPath = `payrollUnique/${payrollReservationId}`;
    if (await getDocument(env, payrollReservationPath)) throw httpError("Payroll already exists for this employee and period", 409);
    const existing = await listDocuments(env, "payrollRecords");
    if (existing.some((item) => String(item.employeeId || "") === String(employee.id) && String(item.period || "") === period)) {
      throw httpError("Payroll already exists for this employee and period", 409);
    }
    const amounts = payrollAmounts(input);
    await validatePayrollLoan(env, employee.id, input.loanId, amounts.loanDeduction, true);
    const requestedStatus = PAYROLL_STATUSES.has(input.status) ? input.status : "ព្រាង";
    const status = requestedStatus === "រង់ចាំអនុម័ត" ? requestedStatus : "ព្រាង";
    const payrollId = `PAY-${period.replace("-", "")}-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;
    const payroll = {
      payrollId,
      employeeId: employee.id,
      employeeName: employee.name || employee.id,
      branch: employee.branch || "",
      branchId: employee.branchId || "",
      period,
      ...amounts,
      loanId: amounts.loanDeduction ? cleanText(input.loanId, 120) : "",
      note: cleanText(input.note, 1000),
      status,
      managerComment: "",
      submittedAt: status === "រង់ចាំអនុម័ត" ? now : "",
      submittedByUid: status === "រង់ចាំអនុម័ត" ? user.uid || "" : "",
      submittedByEmail: status === "រង់ចាំអនុម័ត" ? user.email || "" : "",
      history: [operationHistory(user, "created", status === "រង់ចាំអនុម័ត" ? "បានបង្កើត និងដាក់ស្នើបញ្ជីប្រាក់ខែ" : "បានបង្កើតបញ្ជីប្រាក់ខែ", { netPay: amounts.netPay })],
      createdAt: now,
      createdByUid: user.uid || "",
      createdByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    await commitWrites(env, [
      { path: `payrollRecords/${payrollId}`, data: payroll, exists: false },
      { path: payrollReservationPath, data: { payrollId, employeeId: employee.id, period, createdAt: now }, exists: false },
      operationalAuditWrite("payroll_created", user, payroll, { module: "payrollRecords", period, netPay: amounts.netPay }),
    ]);
    return { ok: true, payroll };
  }

  const { data: payroll, updateTime } = await requiredOperationalDocument(env, "payrollRecords", payload?.payrollId, "Payroll");
  if (!PAYROLL_STATUSES.has(payroll.status)) payroll.status = "ព្រាង";

  if (action === "payroll.update") {
    if (!["ព្រាង", "ត្រូវកែប្រែ"].includes(payroll.status)) throw httpError("Only draft or returned payroll can be edited", 409);
    const patch = payload?.patch || {};
    const amounts = payrollAmounts(patch, payroll);
    const loanId = amounts.loanDeduction ? cleanText(patch.loanId === undefined ? payroll.loanId : patch.loanId, 120) : "";
    await validatePayrollLoan(env, payroll.employeeId, loanId, amounts.loanDeduction, true);
    const next = {
      ...payroll,
      ...amounts,
      loanId,
      note: patch.note === undefined ? payroll.note : cleanText(patch.note, 1000),
      status: payroll.status === "ត្រូវកែប្រែ" ? "ព្រាង" : payroll.status,
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(payroll.history, operationHistory(user, "updated", "បានកែប្រែបញ្ជីប្រាក់ខែ", { netPay: next.netPay }));
    await commitWrites(env, [
      { path: `payrollRecords/${payroll.payrollId || payload.payrollId}`, data: next, updateTime },
      operationalAuditWrite("payroll_updated", user, next, { module: "payrollRecords", netPay: next.netPay }),
    ]);
    return { ok: true, payroll: next };
  }

  if (action === "payroll.submit") {
    if (!["ព្រាង", "ត្រូវកែប្រែ"].includes(payroll.status)) throw httpError("Only draft payroll can be submitted", 409);
    const next = {
      ...payroll,
      status: "រង់ចាំអនុម័ត",
      submittedAt: now,
      submittedByUid: user.uid || "",
      submittedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(payroll.history, operationHistory(user, "submitted", "បានដាក់បញ្ជីប្រាក់ខែសម្រាប់អនុម័ត"));
    await commitWrites(env, [
      { path: `payrollRecords/${payroll.payrollId || payload.payrollId}`, data: next, updateTime },
      operationalAuditWrite("payroll_submitted", user, next, { module: "payrollRecords" }),
    ]);
    return { ok: true, payroll: next };
  }

  if (action === "payroll.review") {
    if (payroll.status !== "រង់ចាំអនុម័ត") throw httpError("Only submitted payroll can be reviewed", 409);
    const decision = cleanText(payload?.decision, 20);
    if (!["approve", "return"].includes(decision)) throw httpError("Payroll review decision is invalid", 400);
    const comment = cleanText(payload?.comment, 1000);
    if (decision === "return" && !comment) throw httpError("A comment is required when returning payroll", 400);
    const approved = decision === "approve";
    const next = {
      ...payroll,
      status: approved ? "បានអនុម័ត" : "ត្រូវកែប្រែ",
      managerComment: comment,
      reviewedAt: now,
      reviewedByUid: user.uid || "",
      reviewedByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(payroll.history, operationHistory(user, approved ? "approved" : "returned", approved ? "បានអនុម័តបញ្ជីប្រាក់ខែ" : "បានបញ្ជូនបញ្ជីប្រាក់ខែឱ្យកែប្រែ", { comment }));
    await commitWrites(env, [
      { path: `payrollRecords/${payroll.payrollId || payload.payrollId}`, data: next, updateTime },
      operationalAuditWrite(approved ? "payroll_approved" : "payroll_returned", user, next, { module: "payrollRecords", comment }),
    ]);
    return { ok: true, payroll: next };
  }

  if (action === "payroll.pay") {
    if (payroll.status !== "បានអនុម័ត") throw httpError("Only approved payroll can be marked paid", 409);
    const payment = payload?.payment || {};
    const paymentDate = validIsoDate(payment.date, "Payment date");
    const paymentReference = cleanText(payment.reference, 200);
    const loanResult = await validatePayrollLoan(env, payroll.employeeId, payroll.loanId, Number(payroll.loanDeduction || 0), true);
    const next = {
      ...payroll,
      status: "បានបើកប្រាក់",
      paymentDate,
      paymentReference,
      paidAt: now,
      paidByUid: user.uid || "",
      paidByEmail: user.email || "",
      updatedAt: now,
      updatedByUid: user.uid || "",
      updatedByEmail: user.email || "",
    };
    next.history = appendOperationHistory(payroll.history, operationHistory(user, "paid", "បានកត់សម្គាល់ថាបើកប្រាក់រួច", { paymentDate, paymentReference, netPay: payroll.netPay }));
    const writes = [
      { path: `payrollRecords/${payroll.payrollId || payload.payrollId}`, data: next, updateTime },
      operationalAuditWrite("payroll_paid", user, next, { module: "payrollRecords", paymentDate, netPay: payroll.netPay }),
    ];
    if (loanResult.loan && Number(payroll.loanDeduction || 0) > 0) {
      const loan = loanResult.loan;
      const deduction = Number(payroll.loanDeduction || 0);
      const paidAmount = Math.round((Number(loan.paidAmount || 0) + deduction) * 100) / 100;
      const balance = Math.max(0, Math.round((Number(loan.amount || 0) - paidAmount) * 100) / 100);
      const loanPayment = {
        paymentId: `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        date: paymentDate,
        amount: deduction,
        note: `Payroll deduction ${payroll.period}`,
        source: "payroll",
        payrollId: payroll.payrollId || payload.payrollId,
        recordedAt: now,
        recordedByUid: user.uid || "",
        recordedByEmail: user.email || "",
      };
      const nextLoan = {
        ...loan,
        payments: [...(Array.isArray(loan.payments) ? loan.payments : []), loanPayment].slice(-500),
        paidAmount,
        balance,
        status: balance === 0 ? "បានសងរួច" : "សកម្ម",
        completedAt: balance === 0 ? now : loan.completedAt || "",
        updatedAt: now,
        updatedByUid: user.uid || "",
        updatedByEmail: user.email || "",
      };
      nextLoan.history = appendOperationHistory(loan.history, operationHistory(user, "payment", "បានកាត់ប្រាក់កម្ចីតាម Payroll", { amount: deduction, payrollId: payroll.payrollId || payload.payrollId, balance }));
      writes.push(
        { path: `staffLoans/${loan.loanId || payroll.loanId}`, data: nextLoan, updateTime: loanResult.state.updateTime },
        operationalAuditWrite("staff_loan_payroll_deduction", user, nextLoan, { module: "staffLoans", payrollId: payroll.payrollId || payload.payrollId, amount: deduction, balance }),
      );
    }
    await commitWrites(env, writes);
    return { ok: true, payroll: next };
  }

  throw httpError("Unsupported payroll action", 404);
}


async function handleOperationsMutation(user, env, body) {
  const action = cleanText(body?.action, 80);
  const payload = body?.payload || {};
  if (action.startsWith("loan.")) return handleLoanOperation(user, env, action, payload);
  if (action.startsWith("asset.")) return handleAssetOperation(user, env, action, payload);
  if (action.startsWith("kpi.")) return handleKpiOperation(user, env, action, payload);
  if (action.startsWith("payroll.")) return handlePayrollOperation(user, env, action, payload);
  throw httpError("Unsupported operations action", 404);
}


const publicRateLimits = new Map();
function clientKey(request, scope) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return `${scope}:${ip}`;
}
function enforcePublicRateLimit(request, scope, limit = 12, windowMs = 15 * 60 * 1000) {
  const key = clientKey(request, scope);
  const now = Date.now();
  const entry = publicRateLimits.get(key);
  if (!entry || entry.resetAt <= now) {
    publicRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw Object.assign(new Error("Too many requests"), { status: 429, code: "auth/too-many-requests" });
}

async function resolveAccountEmail(env, identifier) {
  const value = String(identifier || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("@")) return value;
  if (!validUsername(value)) return "";
  const record = await getDocument(env, `usernames/${value}`);
  return record?.active !== false ? normalizeEmail(record?.email) : "";
}

async function handlePublicLogin(request, env, body) {
  enforcePublicRateLimit(request, "login", 15);
  if (!env.FIREBASE_WEB_API_KEY) throw new Error("FIREBASE_WEB_API_KEY is missing");
  const email = await resolveAccountEmail(env, body?.identifier);
  const password = String(body?.password || "");
  if (!email || !password) throw Object.assign(new Error("Invalid login credentials"), { status: 401, code: "auth/invalid-credential" });
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.localId) {
    const firebaseCode = String(result?.error?.message || "");
    const disabled = firebaseCode === "USER_DISABLED";
    throw Object.assign(new Error(disabled ? "This Login Account is disabled" : "Invalid login credentials"), {
      status: disabled ? 403 : 401,
      code: disabled ? "auth/user-disabled" : "auth/invalid-credential",
    });
  }
  const profile = await getDocument(env, `profiles/${result.localId}`);
  if (profile?.active === false) throw Object.assign(new Error("This Login Account is disabled"), { status: 403, code: "auth/user-disabled" });
  return { ok: true, email };
}

async function handlePublicPasswordReset(request, env, body) {
  enforcePublicRateLimit(request, "password-reset", 6, 60 * 60 * 1000);
  const email = await resolveAccountEmail(env, body?.identifier);
  if (email && env.FIREBASE_WEB_API_KEY) {
    const directory = await getDocument(env, `passwordResetEmails/${email}`);
    if (directory && directory.active !== false && normalizeEmail(directory.email || email) === email) {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      }).catch(() => null);
    }
  }
  // Always return the same response so callers cannot discover accounts.
  return { ok: true, accepted: true };
}

function safeDocumentId(value) {
  const id = String(value || "").trim();
  if (!id || id.length > 180 || id.includes("/") || id === "." || id === "..") throw Object.assign(new Error("Invalid document id"), { status: 400 });
  return id;
}

async function handleSecureCollectionMutation(user, env, body) {
  if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
  const collectionName = String(body?.collectionName || "");
  if (!["attendanceToday", "attendanceHistory", "corrections"].includes(collectionName)) throw Object.assign(new Error("Collection is not allowed"), { status: 403 });
  const upserts = Array.isArray(body?.upserts) ? body.upserts : [];
  const deletes = Array.isArray(body?.deletes) ? body.deletes : [];
  if (upserts.length + deletes.length > 450) throw Object.assign(new Error("Too many records in one request"), { status: 413 });
  if (collectionName !== "corrections" && deletes.length) throw Object.assign(new Error("Attendance records cannot be hard-deleted"), { status: 409 });
  const now = new Date().toISOString();
  const writes = [];
  for (const row of upserts) {
    const id = safeDocumentId(row?.id);
    const data = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : null;
    if (!data) throw Object.assign(new Error("Invalid record data"), { status: 400 });
    if (collectionName.startsWith("attendance") && !data.dateISO) throw Object.assign(new Error("Attendance date is required"), { status: 400 });
    writes.push({ path: `${collectionName}/${id}`, data: { ...data, securityUpdatedAt: now, securityUpdatedByUid: user.uid, securityUpdatedByEmail: user.email } });
  }
  for (const rawId of deletes) writes.push({ delete: `${collectionName}/${safeDocumentId(rawId)}` });
  if (writes.length) {
    writes.push({ path: `auditLogs/${Date.now()}_${crypto.randomUUID()}`, data: {
      type: "secure_collection_mutation", module: collectionName, actorUid: user.uid, actorEmail: user.email,
      upsertCount: upserts.length, deleteCount: deletes.length, createdAt: now,
    }, exists: false });
    await commitWrites(env, writes);
  }
  return { ok: true, upserted: upserts.length, deleted: deletes.length };
}


async function handleRequest(request, env) {
  const origin = allowedOrigin(request, env);
  if (request.method === "OPTIONS") return origin ? preflight(origin) : json({ error: "Origin not allowed" }, 403);
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    const adminConfigured = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_WEB_API_KEY);
    return json({ ok: true, configured: adminConfigured, adminConfigured, telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN), emailConfigured: Boolean(env.RESEND_API_KEY && env.NOTIFICATION_FROM_EMAIL), backupConfigured: Boolean(env.FIRESTORE_BACKUP_BUCKET) }, 200, origin);
  }
  try {
    if (!origin && request.headers.get("origin")) return json({ ok: false, error: "Origin not allowed" }, 403);
    if (url.pathname === "/api/auth/resolve-login" && request.method === "POST") {
      const result = await handlePublicLogin(request, env, await request.json());
      return json(result, 200, origin);
    }
    if (url.pathname === "/api/auth/password-reset" && request.method === "POST") {
      const result = await handlePublicPasswordReset(request, env, await request.json());
      return json(result, 200, origin);
    }
    const user = await verifyFirebaseUser(request, env);
    let result;
    if (url.pathname === "/api/attendance/employee/validate-qr" && request.method === "POST") result = await handleEmployeeQrValidation(user, env, await request.json());
    else if (url.pathname === "/api/attendance/employee" && request.method === "POST") result = await handleEmployeeAttendance(user, env, await request.json());
    else if (url.pathname === "/api/attendance/kiosk/lookup" && request.method === "POST") result = await handleKioskLookup(user, env, await request.json());
    else if (url.pathname === "/api/attendance/kiosk" && request.method === "POST") result = await handleKioskAttendance(user, env, await request.json());
    else if (url.pathname === "/api/telegram/test" && request.method === "POST") result = await handleTest(user, env);
    else if (url.pathname === "/api/telegram/event" && request.method === "POST") result = await handleEvent(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/create" && request.method === "POST") result = await handleCreateEmployee(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/provision-account" && request.method === "POST") result = await handleProvisionEmployeeAccount(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/update" && request.method === "POST") result = await handleUpdateEmployee(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/deactivate" && request.method === "POST") result = await handleDeactivateEmployee(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/reactivate" && request.method === "POST") result = await handleReactivateEmployee(user, env, await request.json());
    else if (url.pathname === "/api/admin/employees/delete-account" && request.method === "POST") result = await handleDeleteEmployeeAccount(user, env, await request.json());
    else if (url.pathname === "/api/admin/login-accounts/audit" && request.method === "POST") result = await handleAuditLoginAccounts(user, env, await request.json());
    else if (url.pathname === "/api/admin/employment-actions/create" && request.method === "POST") result = await handleCreateEmploymentAction(user, env, await request.json());
    else if (url.pathname === "/api/admin/employment-actions/cancel" && request.method === "POST") result = await handleCancelEmploymentAction(user, env, await request.json());
    else if (url.pathname === "/api/admin/system/status" && request.method === "POST") result = await handleSystemStatus(user, env);
    else if (url.pathname === "/api/admin/system/backup" && request.method === "POST") result = await handleSystemBackup(user, env);
    else if (url.pathname === "/api/admin/system/test-email" && request.method === "POST") result = await handleSystemTestEmail(user, env);
    else if (url.pathname === "/api/admin/operations/mutate" && request.method === "POST") result = await handleOperationsMutation(user, env, await request.json());
    else if (url.pathname === "/api/admin/secure-collection/mutate" && request.method === "POST") result = await handleSecureCollectionMutation(user, env, await request.json());
    else if (url.pathname === "/api/telegram/daily-summary" && request.method === "POST") {
      if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
      result = await sendDailySummary(env, true);
    } else return json({ error: "Not found" }, 404, origin);
    return json(result, 200, origin);
  } catch (error) {
    console.error("Worker request failed", error.message);
    return json({ ok: false, error: error.message || "Request failed", code: error.code || "" }, error.status || 500, origin);
  }
}

export default {
  fetch: handleRequest,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([
      sendDailySummary(env).catch((error) => console.error("Daily Telegram summary failed", error.message)),
      processScheduledEmploymentActions(env).catch((error) => console.error("Scheduled employment actions failed", error.message)),
      checkFirestoreBackupOperation(env)
        .then(() => startFirestoreBackup(env))
        .catch((error) => console.error("Scheduled Firestore backup failed", error.message)),
    ]));
  },
};

export {
  decodeFields,
  encodeFields,
  eventMessage,
  normalizeEmployeeStatus,
  attendanceMetrics,
  distanceInMeters,
  normalizeAttendanceAction,
};
