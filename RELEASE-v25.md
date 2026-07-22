# Borribo HRMS v25 — Real Telegram Bot

- Added a separate Cloudflare Worker with Firebase-authenticated endpoints.
- Bot Token and Firebase private key stay in Cloudflare Secrets.
- Sends real Check-in, Check-out, late, leave-request, and leave-decision messages.
- Sends a scheduled daily attendance summary in Cambodia time.
- Prevents duplicate messages with server-side idempotency records.
- Writes successful/failed delivery history to `telegramOutbox`.
- Telegram settings page now tests real delivery and can send the daily report immediately.
- Employees cannot write or forge Telegram delivery logs in Firestore Rules.

## Deploy

1. Deploy Firestore Rules: `npx firebase-tools deploy --only firestore:rules`
2. Follow `telegram-worker/README.md` once to add secrets and deploy the Worker.
3. Add `VITE_TELEGRAM_WORKER_URL` to Cloudflare Pages and redeploy the site.
4. Configure Chat ID and notification toggles from the Telegram Bot page.
