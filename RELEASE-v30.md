# Borribo HRMS v30 — Complete Employee Menu Hardening

## Completed

- Create Firebase Login Account later for an existing employee.
- Route employee create/update/deactivate operations through the authenticated Worker.
- Preserve employee, attendance, leave, and employment-history records when a staff member becomes inactive.
- Block deactivation while a scheduled employment action is pending.
- Process every page of scheduled employment actions instead of only the first 500 documents.
- Reject duplicate employee email, phone number, username, and employment-action decision number.
- Reserve duplicate-sensitive values with atomic Firestore commit preconditions.
- Commit related Firestore employee/profile/user/history writes as one atomic batch.
- Compensate or recover Firebase Authentication changes when a Firestore response fails midway.
- Show a visible warning when `VITE_TELEGRAM_WORKER_URL` or required Firebase Worker secrets are missing.

## Deployment

```powershell
npm install
npx firebase-tools deploy --only firestore:rules
npx wrangler@latest deploy --config telegram-worker/wrangler.toml
npm run dev
```

The Worker still requires `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` secrets. Telegram configuration is now reported separately and does not block employee administration.
