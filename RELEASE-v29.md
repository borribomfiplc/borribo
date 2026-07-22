# Borribo HRMS v29 — Employment Lifecycle

## Added

- Audited employee actions for branch transfer, promotion, job/department change, combined transfer and job change, and resignation/termination.
- Required effective date, decision-letter number, reason, and optional note.
- Immediate actions apply at once; future actions are applied automatically by the existing Cloudflare Worker cron.
- Scheduled actions can be canceled before their effective date.
- Employee detail pages show a permanent employment history with old and new values and the actor who recorded the action.
- Resignation keeps historical HR data, changes the employee to inactive, and disables the linked Firebase Authentication account.
- Browser clients have read-only access to the employment audit collection; the service-account Worker is the only writer.
- Direct edits to branch, department, job title, and status are locked for existing employees so those changes cannot bypass the audit trail.

## Deployment

```powershell
npm install
npx firebase-tools deploy --only firestore:rules
npx wrangler@latest deploy --config telegram-worker/wrangler.toml
npm run dev
```

No new Worker secrets are required. The existing 30-minute cron now processes both Telegram daily summaries and scheduled employment actions.
