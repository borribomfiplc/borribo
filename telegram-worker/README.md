# Borribo Telegram Worker

This Cloudflare Worker sends real Telegram notifications without exposing the
Bot Token or Firebase service-account key to the React frontend.

## One-time setup (Windows PowerShell)

1. Create a bot with `@BotFather`, add it to the target Telegram group, and
   get the group Chat ID.
2. Log in to Cloudflare:

   ```powershell
   npx wrangler login
   ```

3. Store all secrets in Cloudflare. The commands below read the already
   gitignored `serviceAccountKey.json`; they do not upload that file to GitHub.

   ```powershell
   $sa = Get-Content .\serviceAccountKey.json -Raw | ConvertFrom-Json
   $env:TG_TOKEN = "paste-token-from-BotFather"
   $env:TG_TOKEN | npx wrangler secret put TELEGRAM_BOT_TOKEN --config telegram-worker/wrangler.toml
   $sa.client_email | npx wrangler secret put FIREBASE_CLIENT_EMAIL --config telegram-worker/wrangler.toml
   $sa.private_key | npx wrangler secret put FIREBASE_PRIVATE_KEY --config telegram-worker/wrangler.toml
   Remove-Item Env:TG_TOKEN
   ```

4. Deploy and copy the returned `workers.dev` URL:

   ```powershell
   npm run deploy:telegram
   ```

5. Cloudflare Pages → Borribo project → Settings → Environment variables:
   add `VITE_TELEGRAM_WORKER_URL` with that URL, then redeploy the Pages site.
6. In HRMS: Admin/HR → Telegram Bot → enter Chat ID → enable Telegram → Save
   → **ផ្ញើ Test ពិត**.

The scheduled Worker runs every 30 minutes and sends the daily report once at
the configured Cambodia time. `telegramEvents` prevents duplicate event and
daily-summary messages.
