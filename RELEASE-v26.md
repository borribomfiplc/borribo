# Borribo HRMS v26 — Telegram CORS fix

## Fixed

- Telegram Worker now returns a valid empty `204` response for browser CORS
  preflight requests.
- Requests from `http://localhost:5173`, `http://127.0.0.1`, the configured
  production origin, and Cloudflare Pages preview domains can reach the Worker.
- Added a 24-hour preflight cache header.

## Deploy the fix

Run from the project root:

```powershell
npx wrangler@latest deploy --config telegram-worker/wrangler.toml
```

Then refresh the HRMS Telegram Bot page and send a test message. The Worker URL,
Cloudflare secrets, and Firebase settings do not need to be entered again.

## Verification

- Worker JavaScript syntax check passed.
- Browser-style `OPTIONS` request returned status `204` with
  `Access-Control-Allow-Origin: http://localhost:5173`.
- Production Vite build passed.
