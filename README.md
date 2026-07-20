# MFI វត្តមានបុគ្គលិក — Attendance Dashboard

React + Vite + Tailwind CSS project for the MFI staff attendance dashboard,
backed by **Firebase** (Firestore + Auth) and deployed on **Cloudflare
Pages**.

## ដំណើរការ (Getting started)

```bash
npm install
```

Then follow **Firebase setup** below before running `npm run dev` — the app
needs a Firebase project to talk to (a blank screen + a console error about
missing config means you skipped this).

## Firebase setup

### 1. Create the project
1. Go to https://console.firebase.google.com → **Add project** → give it a
   name (e.g. `mfi-attendance`) → you can skip Google Analytics.
2. Once created, click the **Web** icon (`</>`) to register a web app. Give
   it a nickname, skip Firebase Hosting (you're using Cloudflare Pages).
3. Copy the `firebaseConfig` values shown — you'll need them next.

### 2. Enable Firestore and Authentication
1. In the left sidebar: **Build → Firestore Database → Create database** →
   start in **production mode** → pick a location close to your users.
2. **Build → Authentication → Get started → Sign-in method → Email/Password**
   → enable it.
3. **Authentication → Users → Add user** — create at least one login (email +
   password) so you can actually sign in to the dashboard.

### 3. Configure the app
```bash
cp .env.example .env
```
Fill in `.env` with the config values from step 1 (`VITE_FIREBASE_*`).

### 4. Seed demo data (optional but recommended for a first look)
1. Firebase Console → **Project settings (gear icon) → Service accounts →
   Generate new private key** → save the downloaded file as
   `serviceAccountKey.json` in the project root (already gitignored).
2. Run:
   ```bash
   npm run seed
   ```
   This pushes the existing demo employees, branches, leave requests, etc.
   into Firestore so the dashboard isn't empty on first load.

### 5. Lock down access
```bash
npx firebase-tools login
npx firebase-tools use --add        # pick your project
npx firebase-tools deploy --only firestore:rules
```
This publishes `firestore.rules`, which requires sign-in for all reads and
writes — see the comment in that file if you later want per-role permissions
(e.g. employees can only edit their own leave requests).

### 6. Run it
```bash
npm run dev
```
Sign in with the email/password you created in step 2.

## Deploy to Cloudflare Pages

**Option A — Git integration (recommended)**
1. Push this project to a GitHub/GitLab repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings: **Framework preset: Vite**, build command `npm run build`,
   output directory `dist`.
4. **Settings → Environment variables** → add all six `VITE_FIREBASE_*`
   values from your `.env` for both Production and Preview.
5. Save and deploy — every push to your main branch redeploys automatically.

**Option B — CLI**
```bash
npx wrangler login
npm run deploy
```
(`npm run deploy` runs `vite build` then `wrangler pages deploy dist`.) Set
the same environment variables in the Cloudflare dashboard afterward, since
the CLI deploy doesn't read your local `.env`.

### Firebase Auth + Cloudflare domain
Once deployed, add your Cloudflare Pages domain (e.g.
`mfi-attendance.pages.dev` or your custom domain) to **Firebase Console →
Authentication → Settings → Authorized domains**, or sign-in will be
rejected from that origin.

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
mfi-app/
├── index.html                 # HTML entry point, loads Noto Sans Khmer font
├── firestore.rules            # Firestore security rules (sign-in required)
├── firestore.indexes.json     # Firestore composite indexes (add as needed)
├── firebase.json              # Points firebase-tools at the rules/indexes files above
├── wrangler.toml              # Cloudflare Pages CLI deploy config
├── scripts/
│   └── seed.mjs               # One-time script to push demo data into Firestore
├── src/
│   ├── main.jsx                # React root, mounts App.jsx
│   ├── index.css               # Tailwind directives + global styles
│   ├── App.jsx                 # App shell: sidebar, topbar, login/kiosk gate, page routing
│   ├── firebase/
│   │   ├── config.js             # Firebase app init (reads VITE_FIREBASE_* env vars)
│   │   ├── useFirestoreCollection.js  # useState-shaped hook backed by a live Firestore collection
│   │   └── auth.js               # Email/password sign-in helpers
│   ├── data/
│   │   ├── theme.js             # COLORS design tokens
│   │   └── mockData.js          # Seed/demo data + static style maps (used by scripts/seed.mjs)
│   ├── config/
│   │   └── navSections.js       # Sidebar navigation config
│   ├── hooks/
│   │   └── usePagination.js     # Shared pagination hook
│   ├── components/
│   │   ├── ErrorBoundary.jsx
│   │   └── shared/               # Small reusable pieces (form fields, StatCard, NavGroup, ...)
│   └── pages/                    # One file per screen (EmployeeListPage, LoginPage, ...)
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

Every page under `src/pages/` (except `LoginPage`, `KioskCheckInPage`, and
`DashboardHomePage`, which are needed immediately) is loaded with
`React.lazy()` from `App.jsx`, so opening the dashboard only downloads the
code for the screen you're actually looking at — the rest loads on demand
when you click into it.

## Notes

- **Data model**: `employees`, `leaveRequests`, `attendanceToday`,
  `attendanceHistory`, `corrections`, `branches`, `departments`, `jobRoles`,
  `holidays`, `users`, and `roles` are all live Firestore collections (see
  `App.jsx`), synced in real time — changes made in one browser tab or
  device show up in others without a refresh.
- **Settings pages** (`CompanySettingsPage`, `WorkingHoursPage`,
  `SystemSettingsPage`) each store one document under the `settings`
  collection (`settings/company`, `settings/workingHours`,
  `settings/system` — see `src/firebase/settingsDoc.js`). They load once on
  mount and write only when you press **Save**, rather than on every
  keystroke.
- Icons: [lucide-react](https://lucide.dev/). Charts: [recharts](https://recharts.org/).
- Styling uses Tailwind CSS utility classes throughout — no separate CSS
  files per component.

