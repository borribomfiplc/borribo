# BORRIBO HRMS v60 — Security & Data Integrity Hardening

## Security changes
- Removed public Firestore reads from `usernames` and `passwordResetEmails`.
- Added Worker-mediated username/email login verification with uniform invalid-credential responses.
- Added Worker-mediated password reset with a uniform response to prevent account enumeration.
- Added best-effort per-IP login and password-reset rate limits.
- Denied browser writes to `attendanceToday`, `attendanceHistory`, and `corrections`.
- Routed manager attendance/correction writes through an authenticated Worker endpoint.
- Attendance hard-delete is rejected; every protected mutation writes an immutable Admin audit event.
- Added document ID, payload type, request-size, collection allowlist, active-account, role, and origin validation.

## Compatibility changes
- `useFirestoreCollection` transparently routes protected collection mutations through the Worker.
- Leave approvals now write generated attendance records through the protected Worker route.
- Existing Firebase Auth sessions and username login remain supported.

## Required deployment order
1. Deploy the Worker.
2. Deploy Firestore rules.
3. Build and deploy the frontend.

Deploying the rules before the Worker/frontend will temporarily block manual attendance and correction writes.
