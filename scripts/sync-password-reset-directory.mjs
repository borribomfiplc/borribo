// Creates a minimal password-reset directory from all Firebase Auth accounts.
// Run locally only; serviceAccountKey.json is ignored by Git.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  throw new Error("Missing serviceAccountKey.json in the project root.");
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
let nextPageToken;
let total = 0;

do {
  const page = await admin.auth().listUsers(1000, nextPageToken);
  let batch = db.batch();
  let writes = 0;

  for (const user of page.users) {
    if (!user.email || user.disabled) continue;
    const email = user.email.trim().toLowerCase();
    batch.set(db.collection("passwordResetEmails").doc(email), {
      email: user.email,
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    writes += 1;
    total += 1;

    if (writes === 450) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }

  if (writes) await batch.commit();
  nextPageToken = page.pageToken;
} while (nextPageToken);

console.log(`✓ Password-reset directory synced for ${total} active Firebase users.`);
