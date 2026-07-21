// Creates Firebase Auth accounts, custom claims, and Firestore profiles.
// Run locally only. serviceAccountKey.json is ignored by Git.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it before running this command.`);
  return value;
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  throw new Error("Missing serviceAccountKey.json. Download it from Firebase Console → Project settings → Service accounts.");
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const accounts = [
  {
    email: process.env.ADMIN_EMAIL || "admin@borribo.com",
    username: process.env.ADMIN_USERNAME || "admin",
    password: required("ADMIN_PASSWORD"),
    name: process.env.ADMIN_NAME || "Borribo Admin",
    role: "admin",
    branch: "ការិយាល័យកណ្តាល",
  },
  {
    email: process.env.HR_EMAIL || "hr@borribo.com",
    username: process.env.HR_USERNAME || "hr",
    password: required("HR_PASSWORD"),
    name: process.env.HR_NAME || "Borribo HR",
    role: "hr",
    branch: "ការិយាល័យកណ្តាល",
  },
  {
    email: process.env.EMPLOYEE_EMAIL || "employee@borribo.com",
    username: process.env.EMPLOYEE_USERNAME || "employee",
    password: required("EMPLOYEE_PASSWORD"),
    name: process.env.EMPLOYEE_NAME || "Borribo Employee",
    role: "employee",
    employeeId: process.env.EMPLOYEE_ID || "EMP-001",
    branch: "ការិយាល័យកណ្តាល",
  },
];

for (const account of accounts) {
  const username = account.username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(username)) {
    throw new Error(`Invalid username "${account.username}". Use 2-32 English letters, numbers, dots, underscores, or hyphens.`);
  }
  let user;
  try {
    user = await admin.auth().getUserByEmail(account.email);
    await admin.auth().updateUser(user.uid, { password: account.password, displayName: account.name, disabled: false });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await admin.auth().createUser({ email: account.email, password: account.password, displayName: account.name });
  }

  const claims = { role: account.role, branch: account.branch, employeeId: account.employeeId || null };
  await admin.auth().setCustomUserClaims(user.uid, claims);
  await db.collection("profiles").doc(user.uid).set({
    uid: user.uid,
    email: account.email,
    username,
    name: account.name,
    role: account.role,
    branch: account.branch,
    employeeId: account.employeeId || null,
    active: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await db.collection("users").doc(user.uid).set({
    id: user.uid,
    email: account.email,
    username,
    name: account.name,
    role: account.role,
    branch: account.branch,
    status: "សកម្ម",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection("usernames").doc(username).set({
    email: account.email,
    active: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  if (account.employeeId) {
    await db.collection("employees").doc(account.employeeId).set({
      id: account.employeeId,
      uid: user.uid,
      email: account.email,
    }, { merge: true });
  }
  console.log(`✓ ${account.role}: ${username} / ${account.email}`);
}

console.log("\nAccounts are ready. Each person should sign out/in once to receive the new role.");
