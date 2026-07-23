# Release v58 — Functional System Settings

## Runtime settings
- Session timeout now follows the saved 15/30/60-minute value for Admin, HR, Employee and Kiosk accounts.
- Disabling auto-lock now disables inactivity logout.
- In-app notification toggle now controls the topbar notification centre.
- Dark mode is stored in Firestore and synchronises across signed-in devices.
- Added `settings/systemPublic`, a sanitised runtime document readable by active accounts.

## Email notifications
- Added optional Resend integration for leave-request and leave-decision emails.
- Added a manager-only test-email endpoint and configuration status in System Settings.
- Email delivery is deduplicated and logged in `emailEvents` / `emailOutbox`.
- Check-in/check-out email is intentionally disabled to avoid excessive email volume; those events continue through in-app and Telegram channels.

## Backups
- Added scheduled Firestore managed export to Google Cloud Storage.
- Daily, weekly and monthly frequencies are supported.
- Added manual “Backup now”, operation polling, completion/failure status and error display.
- Requires `FIRESTORE_BACKUP_BUCKET` plus the appropriate Google Cloud IAM permissions.

## Company logo
- Company logo now uploads to Firebase Storage and persists in `settings/company`.
- The signed-in sidebar updates from the saved logo in real time.
- Uploads are limited to JPG, PNG or WebP files up to 2 MB.

## Deployment requirements
Deploy the updated Firestore and Storage rules, redeploy the frontend and Worker, then configure optional email and backup variables described in the README.
