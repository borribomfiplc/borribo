# BORRIBO HRMS v63 — Logic & Data-Integrity Hardening

This release is based directly on **v61** and resolves the 15 production issues
identified in the v61 audit. It changes the frontend, Firestore rules, migration
scripts and the authenticated Cloudflare Worker.

## 1. Production demo data and loading state

- Production collection listeners now start empty and never display seed/demo
  records. Demo records are opt-in only in Vite development with
  `VITE_USE_DEMO_DATA=true`.
- Every protected collection exposes loading/error state; the main workspace is
  blocked until the required snapshots are ready.
- Listener failures clear stale/demo records instead of leaving them actionable.
- Protected collection setters reject browser writes and direct callers must use
  an authenticated Worker service.

## 2–3. Trusted and atomic leave workflow

- Employee leave creation/cancellation now goes through `/api/leave/mutate`.
- The Worker derives employee ID, UID, name, branch and role from the authenticated
  profile/employee record; the browser cannot submit another employee's identity.
- Dates, working days, half days, holidays, overlap, medical-document requirements
  and annual quota are validated server-side.
- Date reservations and quota ledgers use Firestore preconditions to prevent
  concurrent overlap or over-allocation.
- Approval/rejection updates the request, reservations, quota, attendance and audit
  log in one atomic commit.
- A requester cannot approve their own leave.

## 4–5. Fingerprint and manual attendance correctness

- Attendance document IDs are canonical: `EMPLOYEE_ID_YYYY-MM-DD`.
- The CSV parser supports quoted values/commas and validates real calendar dates,
  `HH:mm` time and explicit `IN`/`OUT` actions.
- Imports are grouped per employee/day, merge earliest IN and latest OUT, reject an
  unmatched OUT, and are safely committed in chunks.
- Manual attendance stores `HH:mm`, validates check-out after check-in and preserves
  the manager-selected status.
- Today/history writes are committed together with an immutable audit record.
- The attendance migration merges legacy hyphenated fingerprint documents into the
  canonical ID without discarding the richer record.

## 6–8. Safe IDs, trusted organization writes and correction transactions

- Branch, department, job-role, holiday and correction IDs use UUID-based IDs rather
  than `list.length + 1`.
- Organization and GPS/QR configuration changes now use Worker validation, atomic
  linked-record updates, race-safe name/date reservations and audit logs; browser
  writes are denied by rules. Linked records are patched with update masks so an
  organization rename cannot overwrite unrelated concurrent employee edits.
- Attendance correction creation/decision uses the Worker. Approval updates the
  correction and today/history record atomically, and requires an independent reviewer.

## 9. Cambodia timezone

- New records use `Asia/Phnom_Penh` date helpers instead of UTC date slicing for
  payroll, loans, assets, leave, attendance and default dates.

## 10–11. Persistent rate limits and asset-code uniqueness

- Public login/password-reset rate limits are stored in Firestore with optimistic
  concurrency, rather than in an isolate-local `Map`.
- Asset codes use backend-only uniqueness reservation documents with Firestore
  preconditions, including safe reservation transfer when a code changes.

## 12. Maker/checker separation

- Loan, asset, KPI, payroll, payroll-payment, leave and attendance-correction review
  actions reject the creator/requester/submitter as the final reviewer.
- Production therefore requires at least two distinct Admin/HR accounts for workflows
  that need approval or finalization.

## 13. Stable branch filters

- The selected branch is stored by immutable Firestore branch document ID.
- A one-time browser migration converts the legacy stored branch name to its ID.
- The organization migration backfills `branchId` into attendance, leave and
  correction documents while retaining legacy names for display compatibility.

## 14. Notification read state

- Notification IDs are built from stable sorted record IDs.
- Read state is stored in the signed-in user's `notificationStates/{uid}` document,
  merged by Firestore transaction and synchronized between devices.
- Rules limit access to the owner and cap the stored list at 120 IDs.

## 15. Mobile modals

- Manual-attendance, leave-decision and attendance-correction dialogs use mobile
  bottom-sheet behavior, viewport height limits, internal scrolling, sticky headers/
  actions and safe-area padding.

## Upgrade from v61

Back up Firestore first. The migration scripts require a local
`serviceAccountKey.json` and use Firebase Admin privileges.

```bash
npm ci
npm run migrate-attendance
npm run migrate-organization-ids
npm run deploy:telegram
npm run deploy
npx firebase-tools deploy --only firestore:rules
```

Deploy the Worker and v63 frontend before applying the restrictive Firestore rules.
After deployment, hard-refresh browsers and reload/reinstall the PWA so cached v61
assets cannot continue making deprecated direct writes.
