// Deletes every Firebase Authentication login except one verified admin.
// Employee and business records are preserved; linked employee records are
// only detached from the deleted login account.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");
const args = process.argv.slice(2);

function argument(name) {
  const inline = args.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
}

const keepEmail = argument("--keep-email").trim().toLowerCase();
const confirmed = args.includes("--confirm");

if (!keepEmail) {
  throw new Error(
    "Missing --keep-email. Example: npm run clear-login-users -- --keep-email admin@borribo.com.kh",
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  throw new Error(
    "Missing serviceAccountKey.json. Keep the private key in the project root and never upload it to GitHub.",
  );
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();
const deleteField = admin.firestore.FieldValue.delete();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function verifiedAdminRole(user) {
  const [profile, userDocument] = await Promise.all([
    db.collection("profiles").doc(user.uid).get(),
    db.collection("users").doc(user.uid).get(),
  ]);
  const roles = [
    user.customClaims?.role,
    profile.data()?.role,
    userDocument.data()?.role,
  ].map((value) => String(value || "").trim().toLowerCase());
  return roles.includes("admin");
}

async function deleteQueryDocuments(query, batch) {
  const snapshot = await query.get();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
}

async function clearLogin(user) {
  // Disable first so the account cannot sign in while its directories are
  // being removed. A failed cleanup never leaves an active partial account.
  await auth.updateUser(user.uid, { disabled: true });

  const [profile, userDocument, linkedEmployees] = await Promise.all([
    db.collection("profiles").doc(user.uid).get(),
    db.collection("users").doc(user.uid).get(),
    db.collection("employees").where("uid", "==", user.uid).get(),
  ]);

  const email = String(
    user.email || profile.data()?.email || userDocument.data()?.email || "",
  ).trim().toLowerCase();
  const usernames = new Set(
    [profile.data()?.username, userDocument.data()?.username]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );

  const batch = db.batch();
  batch.delete(db.collection("profiles").doc(user.uid));
  batch.delete(db.collection("users").doc(user.uid));

  for (const username of usernames) {
    batch.delete(db.collection("usernames").doc(username));
  }
  if (email) batch.delete(db.collection("passwordResetEmails").doc(email));

  await Promise.all([
    deleteQueryDocuments(
      db.collection("usernames").where("uid", "==", user.uid),
      batch,
    ),
    deleteQueryDocuments(
      db.collection("passwordResetEmails").where("uid", "==", user.uid),
      batch,
    ),
  ]);

  linkedEmployees.docs.forEach((employee) => {
    batch.update(employee.ref, {
      uid: deleteField,
      username: deleteField,
      accountRole: deleteField,
      loginRemovedAt: serverTimestamp,
      updatedAt: serverTimestamp,
    });
  });

  await batch.commit();
  await auth.deleteUser(user.uid);
}

const users = await listAllUsers();
const keeper = users.find(
  (user) => String(user.email || "").trim().toLowerCase() === keepEmail,
);

if (!keeper) {
  throw new Error(
    `Admin "${keepEmail}" was not found. Nothing was deleted. Check the email in Firebase Authentication.`,
  );
}
if (!(await verifiedAdminRole(keeper))) {
  throw new Error(
    `"${keepEmail}" exists but is not verified as role=admin. Nothing was deleted.`,
  );
}

const deleting = users.filter((user) => user.uid !== keeper.uid);
console.log(`\nKEEP ADMIN: ${keeper.email} (${keeper.uid})`);
console.log(`DELETE LOGINS: ${deleting.length}`);
deleting.forEach((user, index) => {
  console.log(`${index + 1}. ${user.email || "(no email)"} [${user.uid}]`);
});

if (!confirmed) {
  console.log("\nPREVIEW ONLY — nothing was deleted.");
  console.log(
    `After checking the list, run:\nnpm run clear-login-users -- --keep-email "${keepEmail}" --confirm`,
  );
  process.exit(0);
}

let deleted = 0;
for (const user of deleting) {
  await clearLogin(user);
  deleted += 1;
  console.log(`✓ Deleted login: ${user.email || user.uid}`);
}

console.log(`\nDone. Deleted ${deleted} login account(s).`);
console.log(`Kept admin: ${keeper.email}`);
console.log("Employee, attendance, leave, payroll, and other business records were preserved.");
