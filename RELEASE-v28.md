# Borribo HRMS v28 — Complete Employee Management

## Completed

- Employee photo selection, validation, resize and preview.
- Employee details page for desktop and mobile.
- Employee form branch, department and job-role options come from Firestore settings.
- Unique employee IDs are reserved through a Firestore transaction counter.
- New employees can optionally receive a Firebase Login Account from the web app.
- Username login uses `username@borribo.com.kh` and creates Auth, profile and lookup documents together.
- Admin can create Admin, HR or Employee accounts; HR can create Employee accounts only.
- Editing a linked employee synchronizes Firebase Auth and profile data.
- Removing a linked employee disables the Login Account before removing the employee record.
- Employee deletion failures are shown in the UI.
- Firestore collection updates now write only changed documents instead of rewriting every record.

## Required deployment (once for v28)

```powershell
npx firebase-tools deploy --only firestore:rules
npx wrangler@latest deploy --config telegram-worker/wrangler.toml
```

Then test locally and push the Pages application:

```powershell
npm install
npm run dev
git add .
git commit -m "Complete employee management and web user provisioning"
git push
```

Existing Worker secrets remain in Cloudflare and do not need to be entered again.
