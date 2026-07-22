const INTERVAL_DAYS = {
  "ប្រចាំថ្ងៃ": 1,
  "ប្រចាំសប្តាហ៍": 7,
  "ប្រចាំខែ": 30,
};

export const qrExpiryFor = (interval = "ប្រចាំថ្ងៃ", from = new Date()) => {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + (INTERVAL_DAYS[interval] || 1));
  return expires.toISOString();
};

export const newQrCredential = (branchId, interval, now = new Date()) => ({
  branchId,
  token: crypto.randomUUID(),
  issuedAt: now.toISOString(),
  expiresAt: qrExpiryFor(interval, now),
});

export const createQrPayload = (credential) => JSON.stringify({
  type: "BORRIBO_ATTENDANCE",
  version: 1,
  branchId: credential.branchId,
  token: credential.token,
  issuedAt: credential.issuedAt,
  expiresAt: credential.expiresAt,
});

export const parseQrPayload = (rawValue) => {
  try {
    const value = JSON.parse(String(rawValue || "").trim());
    if (value.type !== "BORRIBO_ATTENDANCE" || value.version !== 1) return null;
    if (!value.branchId || !value.token || !value.expiresAt) return null;
    return value;
  } catch {
    return null;
  }
};

export const sha256 = async (value) => {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const publicQrCredential = async (credential, interval) => ({
  branchId: credential.branchId,
  tokenHash: await sha256(credential.token),
  issuedAt: credential.issuedAt,
  expiresAt: credential.expiresAt,
  interval,
  version: 1,
});

export const qrCredentialExpired = (credential, now = new Date()) => (
  !credential?.expiresAt || new Date(credential.expiresAt).getTime() <= now.getTime()
);
