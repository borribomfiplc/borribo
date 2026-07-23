# MFI វត្តមានបុគ្គលិក — Attendance Dashboard

> v59 adds secure Staff Loan, Asset, KPI and Payroll workflows with approvals,
> audit history, attachments, depreciation and atomic loan deductions. Deploy
> Firestore/Storage rules and the Telegram Worker before the frontend.

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

### 4. Seed initial data (run once for a new project)
1. Firebase Console → **Project settings (gear icon) → Service accounts →
   Generate new private key** → save the downloaded file as
   `serviceAccountKey.json` in the project root (already gitignored).
2. Run:
   ```bash
   npm run seed
   ```
   This pushes the existing demo employees, branches, leave requests, etc.
   into Firestore so the dashboard isn't empty on first load.

### 5. Create the first real accounts and roles

This app does **not** create Firebase users in the browser. Run this locally
with the service-account key from step 4. It creates Firebase Auth accounts,
custom claims, and Firestore profiles together.

Windows PowerShell:

```powershell
$env:ADMIN_PASSWORD = "choose-a-strong-admin-password"
$env:HR_PASSWORD = "choose-a-strong-hr-password"
$env:EMPLOYEE_PASSWORD = "choose-a-strong-employee-password"
npm run provision-users
```

The default email addresses are `admin@borribo.com.kh`, `hr@borribo.com.kh`, and
`employee@borribo.com.kh`. You can override them with `ADMIN_EMAIL`, `HR_EMAIL`,
and `EMPLOYEE_EMAIL`. The matching default usernames are `admin`, `hr`, and
`employee`; override them with `ADMIN_USERNAME`, `HR_USERNAME`, and
`EMPLOYEE_USERNAME` (2-32 English letters/numbers plus `.`, `_`, or `-`). Do not add any of these passwords or
`serviceAccountKey.json` to GitHub.

### Username login for an existing account

After deploying the Firestore rules below, add a username for each existing
Firebase Auth account. This keeps email login working too.

```powershell
$env:LOGIN_EMAIL = "hunrina@borribo.com.kh"
$env:LOGIN_USERNAME = "hunrina"
npm run set-username
```

Then the person can sign in with either `hunrina` or
`hunrina@borribo.com.kh`, using the same password.

### Password-reset verification

The reset link is sent only after the app finds the email in its Firebase-user
directory. After updating this version, deploy the rules and run this command
once to add every existing Firebase Authentication user to that directory:

```powershell
npm run sync-password-reset-directory
```

When you run `npm run provision-users` or `npm run set-username` later, the
matching email is added automatically.

### 6. Deploy the Firestore security rules
```bash
npx firebase-tools login
npx firebase-tools use --add        # pick your project
npx firebase-tools deploy --only firestore:rules
```
This publishes the Admin / HR / Employee security rules. A Cloudflare deploy
updates only the frontend; it does **not** deploy these Firebase rules.

### 7. Run it
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
   values from your `.env` for both Production and Preview. After deploying
   the Telegram Worker, also add `VITE_TELEGRAM_WORKER_URL`.
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

## Clear all login accounts except Admin

This command removes Firebase Authentication logins and their login-directory
documents, while preserving employees, attendance, leave, payroll, and other
business records. It refuses to continue unless the account being kept exists
and has the `admin` role.

Preview first (nothing is deleted):

```bash
npm run clear-login-users -- --keep-email admin@borribo.com.kh
```

After checking the preview list, confirm the deletion:

```bash
npm run clear-login-users -- --keep-email admin@borribo.com.kh --confirm
```

`serviceAccountKey.json` must remain in the project root and must never be
uploaded to GitHub.

## Check every Login Account

Sign in as Admin and open **ការកំណត់ → អ្នកប្រើប្រាស់ និងតួនាទី**.
The page checks every real Firebase Authentication account against its
Firestore Profile, Role claim, Employee link, Username directory, and password
reset directory.

- **អាច Login** means the account structure is ready for email/password login.
- **ត្រូវកែ** shows the exact missing or conflicting record.
- **ពិនិត្យ និងជួសជុល** rebuilds safe account metadata and directory records.
  It never reads or changes a user's password, never enables an intentionally
  disabled account, and does not guess when two valid roles conflict.

The audit uses the existing protected Worker endpoint and is available only to
an authenticated `admin` account.

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

### Security and deployment checklist

- The `profiles/{uid}` document and Firebase custom claim must agree on the
  user's role. Run `npm run provision-users` for every initial account.
- Employees can access only their own leave requests. HR and Admin can manage
  HR data; only Admin can manage user-role records.
- `VITE_FIREBASE_*` values are web-app configuration, not private server
  secrets. Put the same values in Cloudflare Pages for both Production and
  Preview. Keep `.env`, `serviceAccountKey.json`, and passwords local.
- Add both your Cloudflare Pages domain and `localhost` to Firebase
  Authentication → Settings → Authorized domains.
- Commit `.gitattributes` once. It prevents the Windows CRLF/LF issue that
  previously showed every source file as changed.
- Never include `.git`, `node_modules`, `dist`, `.env`, or
  `serviceAccountKey.json` when sharing a ZIP of this project.
- After deploying this version's Firestore rules, sign in as Admin/HR, open
  **GPS និង QR**, verify each branch latitude/longitude/radius, and press
  **រក្សាទុក** once. This creates `settings/gpsQrPublic` and the hashed,
  expiring `qrTokens/{branchId}` documents. Employee attendance deliberately
  fails closed until this migration is complete.
- The plaintext QR credentials stay in manager-only `settings/gpsQr`.
  Employees can read only the GPS requirements and a SHA-256 token hash with
  its expiry. A QR is also tied to one branch and is rejected after expiry.
- Attendance, leave, and monthly reports support date/month filtering, UTF-8
  CSV export (opens correctly in Excel), and browser Print / Save as PDF.
- **Real Telegram delivery** is handled by the separate Cloudflare Worker in
  `telegram-worker/`. Follow `telegram-worker/README.md` once to add the Bot
  Token and Firebase service-account values as Cloudflare Secrets. Never add
  these secrets to a frontend `VITE_*` variable.

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

## Functional System Settings (v58)

System settings are now enforced at runtime rather than only saved as form values.

### Public runtime settings

Admin/HR save the private `settings/system` document and a sanitised `settings/systemPublic` document. Active signed-in accounts read `systemPublic` in real time for:

- inactivity auto-lock and the selected 15/30/60-minute timeout;
- topbar in-app notifications;
- global light/dark mode.

Deploy the updated Firestore rules before using these settings:

```bash
firebase deploy --only firestore:rules
```

### Email notifications (optional)

Leave requests are emailed to active Admin/HR profiles. Leave decisions are emailed to the employee account. Attendance email is deliberately excluded to avoid excessive messages; attendance continues through Telegram and the in-app notification centre.

Configure the Worker:

```bash
cd telegram-worker
npx wrangler secret put RESEND_API_KEY
```

Add this Worker variable in `telegram-worker/wrangler.toml` or the Cloudflare dashboard:

```toml
NOTIFICATION_FROM_EMAIL = "BORRIBO HRMS <hrms@your-verified-domain.com>"
```

The sender domain must be verified with the email provider. The System Settings page shows whether the provider is configured and includes a test-email button.

### Automatic Firestore backup (optional)

Create a Google Cloud Storage bucket, then configure its bucket name without `gs://`:

```toml
FIRESTORE_BACKUP_BUCKET = "your-backup-bucket-name"
```

The Worker Firebase service account must be able to start Firestore exports and write objects to that bucket. At minimum, grant the appropriate Firestore import/export role and Storage object creation permissions. The Worker checks every 30 minutes, starts a backup only when the selected daily/weekly/monthly interval is due, and polls the long-running export operation until it completes or fails.

### Persistent company logo

Company Settings uploads logos to Firebase Storage under `company/`. Deploy the updated Storage rules:

```bash
firebase deploy --only storage
```

Allowed formats are JPG, PNG and WebP, with a maximum size of 2 MB. The saved logo appears in the signed-in sidebar; the unauthenticated login page keeps the bundled fallback logo.

## Operations and Payroll workflows (v59)

The Staff Loan, Asset, KPI and Payroll modules now write through the authenticated
Cloudflare Worker instead of writing operational records directly from the
browser. `VITE_TELEGRAM_WORKER_URL` is therefore required for these modules.

### Staff Loan attachments

Managers can attach PDF, JPG, PNG or WebP files up to 5 MB each. Files are
stored below `loanAttachments/` in Firebase Storage and are readable only by
Admin/HR accounts under the supplied Storage rules.

### Asset depreciation

Asset depreciation uses the straight-line method when purchase date, useful
life and salvage value are supplied. Book value is calculated in the UI from
the saved acquisition fields. Changing material acquisition values on an
approved asset automatically sends it back for approval.

### Payroll and Staff Loan integration

Each employee can have only one payroll record per month. When an approved
payroll is marked paid, any selected Staff Loan deduction and the payroll status
are committed atomically, so one cannot succeed without the other.

### Required deployment order

```bash
# Back up Firestore first
npx firebase-tools deploy --only firestore:rules,storage
npm run deploy:telegram
npm run build
npm run deploy
```

Deploy the Worker before the frontend because all Loan, Asset, KPI and Payroll
mutations depend on `/api/admin/operations/mutate`. No data migration is
required; legacy assets are treated as approved and legacy records gain history
fields on their first managed update.
