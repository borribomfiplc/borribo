import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { auth } from "./config";
import { requestSecurePasswordReset, resolveVerifiedLogin } from "../services/secureWrites";

/**
 * Signs in with email + password. `remember` picks whether the session
 * survives a browser restart (localStorage) or ends when the tab closes
 * (sessionStorage) — mirrors the app's old "ចងចាំខ្ញុំ" (remember me) checkbox.
 */
export async function login(identifier, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const result = await resolveVerifiedLogin(identifier, password);
  const email = result.email;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logout() {
  return signOut(auth);
}

export async function sendPasswordReset(identifier) {
  // The Worker resolves the identifier and sends the reset email without
  // exposing whether a username/email exists. The UI always shows the same
  // confirmation message to prevent account enumeration.
  return requestSecurePasswordReset(identifier);
}

/** Subscribes to auth state; returns an unsubscribe function. */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Human-readable Khmer messages for the Firebase Auth error codes users will actually hit. */
export function authErrorMessage(err) {
  const code = err?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "ឈ្មោះអ្នកប្រើប្រាស់ ឬលេខសម្ងាត់មិនត្រឹមត្រូវ";
  }
  if (code === "auth/user-disabled") return "គណនី Login នេះត្រូវបានបិទ។ សូមទាក់ទង Admin ឬ HR";
  if (code === "auth/invalid-email") return "អ៊ីមែលមិនត្រឹមត្រូវ";
  if (code === "auth/invalid-username") return "Username ត្រូវមានអក្សរអង់គ្លេស លេខ ឬ . _ - និងយ៉ាងតិច 2 តួអក្សរ";
  if (code === "auth/username-not-found") return "មិនរកឃើញ Username នេះទេ។ សូមប្រើអ៊ីមែល ឬទាក់ទងផ្នែកព័ត៌មានវិទ្យា";
  if (code === "auth/email-not-found") return "មិនរកឃើញ Email នេះទេ។ សូមប្រើអ៊ីមែល ឬទាក់ទងផ្នែកព័ត៌មានវិទ្យា";
  if (code === "auth/too-many-requests") return "អ្នកព្យាយាមចូលច្រើនដងពេក សូមព្យាយាមម្ដងទៀតពេលក្រោយ";
  if (code === "auth/network-request-failed") return "មិនអាចភ្ជាប់បណ្ដាញបានទេ សូមពិនិត្យអ៊ីនធឺណិត";
  if (code === "auth/missing-email") return "សូមបញ្ចូលអ៊ីមែលជាមុនសិន";
  return "មានបញ្ហាកើតឡើង សូមព្យាយាមម្ដងទៀត";
}
