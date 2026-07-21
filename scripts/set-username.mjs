// Adds or changes the username for an existing Firebase Auth account.
// Run locally only; serviceAccountKey.json is ignored by Git.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");
const email = (process.env.LOGIN_EMAIL || "").trim().toLowerCase();
const username = (process.env.LOGIN_USERNAME || "").trim().toLowerCase();

if (!email || !username) {
  throw new Error("Set LOGIN_EMAIL and LOGIN_USERNAME before running this command.");
}
if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) {
  throw new Error("Username must have 2-32 English letters, numbers, dots, underscores, or hyphens.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  throw new Error("Missing serviceAccountKey.json in the project root.");
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const existing = await db.collection("usernames").doc(username).get();
if (existing.exists && existing.data()?.email?.toLowerCase() !== email) {
  throw new Error(`Username "${username}" is already assigned to another account.`);
}

const user = await admin.auth().getUserByEmail(email);
const batch = db.batch();
batch.set(db.collection("usernames").doc(username), {
  email,
  active: true,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
batch.set(db.collection("passwordResetEmails").doc(email), {
  email,
  active: true,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
batch.set(db.collection("profiles").doc(user.uid), { username, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
batch.set(db.collection("users").doc(user.uid), { username, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
await batch.commit();

console.log(`✓ ${username} can now sign in as ${email}`);
