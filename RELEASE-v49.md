# Borribo HRMS v49 — Stabilization

## Leave

- Counts working days only; Sundays and configured public holidays are excluded.
- Splits quota usage and remaining balances by calendar year.
- Recalculates authoritative working dates again at approval time.
- Allows morning and afternoon half-day requests on the same date without treating them as duplicates.
- Keeps half-day leave metadata without overwriting an employee's actual attendance record.

## Attendance

- Attendance corrections use the signed-in HR/Admin identity instead of a fixed demo name.
- Approval/rejection decisions store reviewer comments and reviewer identity.
- Approved corrections recalculate hours, late minutes, early-leave minutes, and final status.
- Added “Close today's register” to persist all absence/leave placeholders into daily history.

## Employees and organization

- Added direct manager and emergency-contact fields.
- New and edited employees store stable branch, department, and role IDs.
- Employee phone/email duplicate checks run before saving.
- Employee forms and employment actions use active organization options only.
- Branches, departments, and job roles can be edited with duplicate-name protection.
- Organization renames update linked employee/job-role name snapshots.
- The organization transfer screen now uses the same audited Employment Action flow as employee details.
- Future-dated transfers stay scheduled and are applied by the Worker on their effective date.
- Added an optional one-time organization-ID migration script for legacy records.

## Calendar

- Current-day absence totals include every active employee, even before the daily register is closed.
- Leave appears only on real working dates.
- Half-day leave is labeled explicitly and request IDs appear in day details.

## Deployment

```powershell
npm install
npx firebase-tools deploy --only "firestore:rules,firestore:indexes"
npm run deploy:telegram
npm run dev
```

For an existing database, the optional one-time ID backfill requires a local
`serviceAccountKey.json` and can be run with:

```powershell
npm run migrate-organization-ids
```

Never commit or upload `serviceAccountKey.json` or `.env`.
