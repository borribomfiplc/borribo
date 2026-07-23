# Borribo HRMS v57 — All-user Login Audit

## Added

- Admin can check every real Firebase Authentication account from
  **អ្នកប្រើប្រាស់ និងតួនាទី**.
- Cross-checks Firebase Auth, `profiles`, role custom claims, `users`,
  employee links, username mappings, and password-reset mappings.
- Shows **អាច Login** or **ត្រូវកែ** with the exact issue for each account.
- Safe repair rebuilds missing metadata and directory records without reading
  or changing passwords.
- Includes orphan Profile detection when its Firebase Auth account is missing.

## Login fixes

- Email identifiers are trimmed and normalized to lowercase before sign-in.
- Disabled Firebase accounts now show a clear Khmer error instead of a generic
  failure.

## Verification

- `node --check telegram-worker/src/index.js`
- `npm run build`
- `npx wrangler deploy --config telegram-worker/wrangler.toml --dry-run`

The Worker must be deployed for the new audit endpoint to work.
