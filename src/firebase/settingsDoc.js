import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./config";
import { normalizeSystemSettings, publicSystemSettings } from "../config/systemSettings";

// Settings screens (Company, Working Hours, System) are one form each, not
// a list — so instead of useFirestoreCollection (which is built for arrays
// with per-row IDs) they use one Firestore document per screen, stored
// under the "settings" collection ("settings/company", "settings/workingHours",
// "settings/system"). Data is loaded once on mount and written explicitly
// when the user presses Save, matching each page's existing "Save" button UX
// instead of writing to Firestore on every keystroke.

/**
 * Loads a settings document, merged over `defaults` so new fields added to
 * a page later always have a value even for documents saved before that
 * field existed. Creates the document with `defaults` if it doesn't exist yet.
 */
export async function loadSettingsDoc(docId, defaults) {
  const ref = doc(db, "settings", docId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return { ...defaults, ...snap.data() };
    await setDoc(ref, defaults);
    return defaults;
  } catch (err) {
    console.error(`[firestore] Failed to load settings/${docId}:`, err);
    return defaults;
  }
}

/** Writes a settings document (merges with whatever is already stored). */
export async function saveSettingsDoc(docId, data) {
  await setDoc(doc(db, "settings", docId), data, { merge: true });
}

/**
 * Saves private manager-only system settings and a sanitised read-only copy
 * used at runtime by every active account. This keeps email/backup metadata
 * private while still allowing session timeout, theme and in-app notification
 * preferences to take effect for employees and kiosks.
 */
export async function saveSystemSettings(data) {
  const normalized = normalizeSystemSettings(data);
  const batch = writeBatch(db);
  batch.set(doc(db, "settings", "system"), {
    ...normalized,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  batch.set(doc(db, "settings", "systemPublic"), {
    ...publicSystemSettings(normalized),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return normalized;
}

/** Updates a small subset without replacing unrelated private settings. */
export async function updateSystemSettings(patch) {
  const privatePatch = { ...patch, updatedAt: serverTimestamp() };
  const allowedPublicKeys = ["pushNotif", "autoLock", "darkMode", "sessionTimeoutMinutes"];
  const publicPatch = Object.fromEntries(
    Object.entries(patch).filter(([key]) => allowedPublicKeys.includes(key)),
  );
  const batch = writeBatch(db);
  batch.set(doc(db, "settings", "system"), privatePatch, { merge: true });
  if (Object.keys(publicPatch).length) {
    batch.set(doc(db, "settings", "systemPublic"), {
      ...publicPatch,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
}
