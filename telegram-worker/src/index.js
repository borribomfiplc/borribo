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
        ...(write.exists === undefined ? {} : { currentDocument: { exists: write.exists } }),
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
    role: custom.role || payload.role || "",
    employeeId: custom.employeeId || payload.employeeId || "",
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

async function logTelegramEvent(env, id, data) {
  await putDocument(env, `telegramOutbox/${id}`, { id, ...data, createdAt: new Date().toISOString() });
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

async function handleRequest(request, env) {
  const origin = allowedOrigin(request, env);
  if (request.method === "OPTIONS") return origin ? preflight(origin) : json({ error: "Origin not allowed" }, 403);
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    const adminConfigured = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_WEB_API_KEY);
    return json({ ok: true, configured: adminConfigured, adminConfigured, telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN) }, 200, origin);
  }
  try {
    const user = await verifyFirebaseUser(request, env);
    let result;
    if (url.pathname === "/api/telegram/test" && request.method === "POST") result = await handleTest(user, env);
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
    else if (url.pathname === "/api/telegram/daily-summary" && request.method === "POST") {
      if (!manager(user)) throw Object.assign(new Error("Admin or HR role is required"), { status: 403 });
      result = await sendDailySummary(env, true);
    } else return json({ error: "Not found" }, 404, origin);
    return json(result, 200, origin);
  } catch (error) {
    console.error("Worker request failed", error.message);
    return json({ ok: false, error: error.message || "Request failed" }, error.status || 500, origin);
  }
}

export default {
  fetch: handleRequest,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([
      sendDailySummary(env).catch((error) => console.error("Daily Telegram summary failed", error.message)),
      processScheduledEmploymentActions(env).catch((error) => console.error("Scheduled employment actions failed", error.message)),
    ]));
  },
};

export { decodeFields, encodeFields, eventMessage, normalizeEmployeeStatus };
