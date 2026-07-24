# BORRIBO HRMS v64 — Minor Reliability & UI Fixes

This release builds on **v63** and resolves the smaller reliability, consistency,
accessibility and UI issues found during the production audit. Firestore rules and
data migrations are unchanged from v63; the authenticated Worker changes only for
editable asset-maintenance records.

## Version and session messaging

- Login and sidebar versions now come from `package.json`, so release labels cannot
  drift between pages.
- Copyright year is generated at runtime.
- Auto-lock stores the configured timeout and the login notice reports the real
  15/30/60-minute value instead of a fixed five-minute message.
- Password-reset requests cannot be submitted twice while one is pending, and the
  success message remains account-enumeration safe.

## Settings reliability

- Failed settings reads are no longer silently replaced with defaults.
- Company, working-hours, system, GPS/QR and Telegram pages display load/save errors
  and disable saving until the original settings document has loaded successfully,
  preventing an offline page from overwriting production settings with defaults.
- Save buttons show an in-progress state and reject duplicate submissions.
- Toggle controls expose proper switch semantics for keyboards and screen readers.

## Dark mode and global feedback

- Dark mode now uses exact Tailwind utility selectors. Broad substring matching no
  longer turns hover-only button backgrounds on permanently.
- Common panels, status colors, form controls, borders and charts have explicit dark
  variants.
- A failed dark-mode save now produces a visible topbar alert instead of only a
  console message.

## Navigation and notifications

- Includes the polished reports submenu introduced after v61: icons, descriptions,
  parent/child active states and clearer touch targets.
- The notification dropdown is compact, scrollable and has stable unread hierarchy,
  icons and an empty state suitable for mobile screens.

## Maintenance, batch and error correctness

- Asset maintenance records can be edited instead of creating a second completed
  record to correct a mistake.
- `totalMaintenanceCost` is recalculated from maintenance history on every create or
  edit, correcting legacy drift and preventing duplicate cost accumulation.
- Generic Firestore collection batches remain chunked to 450 writes, below the
  500-write service limit.
- Loan attachment download failures are shown to the user instead of being silently
  ignored.
- Calendar records use UUID-based IDs and deletion failures appear in the page.

## Upgrade from v63

No migration or Firestore-rule deployment is required.

```bash
git apply --check borribo-v64-minor-fixes.patch
git apply borribo-v64-minor-fixes.patch
npm ci
npm run deploy:telegram
npm run build
npm run deploy
```

Deploy the Worker before the frontend because the Asset page uses the new
`asset.maintenance.update` action.

## Upgrade directly from v61

Use the full v64 package rather than the v63-to-v64 patch. Back up Firestore, then
run the two v63 migrations and deploy Worker/frontend before the restrictive rules:

```bash
npm ci
npm run migrate-attendance
npm run migrate-organization-ids
npm run deploy:telegram
npm run build
npm run deploy
npx firebase-tools deploy --only firestore:rules
```
