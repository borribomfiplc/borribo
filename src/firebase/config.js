// Firebase initialization.
//
// All values come from Vite env vars (VITE_FIREBASE_*), which you set in a
// local `.env` file for development and in the Cloudflare Pages dashboard
// (Settings → Environment variables) for production. See `.env.example`
// and README.md → "Firebase setup" for step-by-step instructions.
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length) {
  // Loud, obvious warning instead of a cryptic Firebase SDK error, since a
  // missing .env file is the #1 cause of a blank screen on first setup.
  // eslint-disable-next-line no-console
  console.error(
    `[firebase] Missing config values: ${missingKeys.join(", ")}. ` +
      `Copy .env.example to .env and fill in your Firebase project's keys ` +
      `(see README.md → Firebase setup).`
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
