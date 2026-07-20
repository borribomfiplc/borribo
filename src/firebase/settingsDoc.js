import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";

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
    // eslint-disable-next-line no-console
    console.error(`[firestore] Failed to load settings/${docId}:`, err);
    return defaults; // fall back to defaults so the form still renders
  }
}

/** Writes a settings document (merges with whatever is already stored). */
export async function saveSettingsDoc(docId, data) {
  await setDoc(doc(db, "settings", docId), data, { merge: true });
}
