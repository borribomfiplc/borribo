import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";

function usernameError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

/**
 * Firebase deliberately hides whether an email address has an Auth account.
 * For this HRMS reset flow, the Admin scripts maintain a minimal public
 * directory of active account emails. It lets the UI stop before asking
 * Firebase to send a reset email for an address that is not an HRMS account.
 */
async function verifyPasswordResetEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const emailDoc = await getDoc(doc(db, "passwordResetEmails", normalizedEmail));

  if (!emailDoc.exists() || !emailDoc.data()?.active) {
    throw usernameError("auth/email-not-found");
  }

  return emailDoc.data()?.email || normalizedEmail;
}

/**
 * Firebase Email/Password Auth signs in with an email only. For a username,
 * resolve one exact document in the public `usernames` directory first.
 * The directory contains only a username -> email mapping; passwords and
 * roles always remain in Firebase Auth / protected profile documents.
 */
export async function resolveLoginEmail(identifier) {
  const value = identifier.trim();
  if (value.includes("@")) return value;

  const username = value.toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) {
    throw usernameError("auth/invalid-username");
  }

  const usernameDoc = await getDoc(doc(db, "usernames", username));
  if (!usernameDoc.exists() || !usernameDoc.data()?.active || !usernameDoc.data()?.email) {
    throw usernameError("auth/username-not-found");
  }
  return usernameDoc.data().email;
}

/**
 * Signs in with email + password. `remember` picks whether the session
 * survives a browser restart (localStorage) or ends when the tab closes
 * (sessionStorage) — mirrors the app's old "ចងចាំខ្ញុំ" (remember me) checkbox.
 */
export async function login(identifier, password, remember = true) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const email = await resolveLoginEmail(identifier);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logout() {
  return signOut(auth);
}

export async function sendPasswordReset(identifier) {
  const email = await resolveLoginEmail(identifier);
  const verifiedEmail = await verifyPasswordResetEmail(email);
  return sendPasswordResetEmail(auth, verifiedEmail);
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
  if (code === "auth/invalid-email") return "អ៊ីមែលមិនត្រឹមត្រូវ";
  if (code === "auth/invalid-username") return "Username ត្រូវមានអក្សរអង់គ្លេស លេខ ឬ . _ - និងយ៉ាងតិច 2 តួអក្សរ";
  if (code === "auth/username-not-found") return "មិនរកឃើញ Username នេះទេ។ សូមប្រើអ៊ីមែល ឬទាក់ទងផ្នែកព័ត៌មានវិទ្យា";
  if (code === "auth/email-not-found") return "មិនរកឃើញ Email នេះទេ។ សូមប្រើអ៊ីមែល ឬទាក់ទងផ្នែកព័ត៌មានវិទ្យា";
  if (code === "auth/too-many-requests") return "អ្នកព្យាយាមចូលច្រើនដងពេក សូមព្យាយាមម្ដងទៀតពេលក្រោយ";
  if (code === "auth/network-request-failed") return "មិនអាចភ្ជាប់បណ្ដាញបានទេ សូមពិនិត្យអ៊ីនធឺណិត";
  if (code === "auth/missing-email") return "សូមបញ្ចូលអ៊ីមែលជាមុនសិន";
  return "មានបញ្ហាកើតឡើង សូមព្យាយាមម្ដងទៀត";
}
