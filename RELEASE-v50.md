# Borribo HRMS v50 — Employee Recovery and Worker Encoding Fix

## Fixed

- Repaired all corrupted Khmer text and emoji in `telegram-worker/src/index.js`.
- Added compatibility for employee status values saved by the affected v49 Worker.
- Added **Reactivate Employee** for desktop and mobile employee lists.
- Reactivation restores the employee status, Firebase Login, profile, username login, password-reset directory, and user record while preserving history.
- Prevented normal employee editing from bypassing the deactivate/reactivate workflow.
- Fixed employee status counts and status display fallbacks.
- Prevented inactive employees from using Kiosk attendance.
- Excluded inactive employees from attendance closing, organization transfer, calendar absence/birthday calculations, and Telegram daily summaries.
- Restricted Worker CORS to the configured Pages project, its preview subdomains, and localhost.

## Deploy

Deploy the Worker first, then push the frontend:

```powershell
cd "C:\Users\hunrina\Desktop\BMI PROJECT\borribo"
npm install
npm run deploy:telegram

git add .
git commit -m "Fix employee status and add reactivation"
git push origin main
```

After Cloudflare Pages finishes deploying, press `Ctrl + Shift + R`.
Open **បញ្ជីបុគ្គលិក** and press the green **សកម្មវិញ** button for the affected inactive user.

Do not commit `.env`, `serviceAccountKey.json`, or `telegram-worker/.dev.vars`.

## Maintenance note

`npm audit` reports advisories in the local build/deployment toolchain. Resolving them requires major upgrades of Vite, Wrangler, and Firebase Admin, so they were not force-upgraded in this functional recovery release.
