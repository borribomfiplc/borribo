# Critical Security Patch — Attendance និង Kiosk

Patch នេះកែបញ្ហា Critical ចំនួន 4៖

1. Employee មិនអាចសរសេរ Attendance ដោយផ្ទាល់ពី Browser ទៀត។
2. Kiosk មិនអាច Download Employee Collection និង PIN ទាំងអស់ទៀត។
3. Kiosk មិនអាចបង្កើត Attendance ក្លែងក្លាយដោយផ្ទាល់ទៅ Firestore ទៀត។
4. `settings/gpsQr` មិនអាចត្រូវបាន Kiosk អានតាម Wildcard Rule ទៀត។

## Architecture ថ្មី

- Employee និង Kiosk ផ្ញើ Firebase ID Token ទៅ Cloudflare Worker។
- Worker ពិនិត្យ Role, Active Profile, Employee, Branch, PIN, GPS និង QR។
- Worker កំណត់ Date/Time តាម `Asia/Phnom_Penh`។
- Worker សរសេរ `attendanceToday` និង `attendanceHistory` ជា Atomic Commit។
- Kiosk PIN ខុស 5 ដងក្នុងរយៈពេល 5 នាទី នឹងចាក់សោ Kiosk 15 នាទី។
- PIN គំរូមិនត្រូវបាន Bundle ក្នុង Frontend ទៀត។

## លំដាប់ Deploy ដែលមានសុវត្ថិភាព

### 1. Deploy Worker មុន

```bash
npm run deploy:telegram
```

ត្រូវប្រាកដថា Worker មាន Secrets៖

```bash
cd telegram-worker
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

### 2. Deploy Web App ថ្មី

```bash
npm ci
npm run deploy
```

### 3. Deploy Firestore Rules ថ្មីភ្លាមៗ

```bash
firebase deploy --only firestore:rules
```

### 4. Rotate PIN ចាស់

ដោយសារ Version ចាស់មាន PIN គំរូក្នុង Frontend Source ត្រូវប្ដូរ PIN របស់ Employee ទាំងអស់ម្តង៖

```bash
npm run rotate-kiosk-pins
```

Command នេះត្រូវការ `serviceAccountKey.json` នៅ Project Root ហើយនឹងបង្ហាញ Employee/PIN Mapping ក្នុង Terminal តែមួយដង។ ត្រូវរក្សាទុក Mapping នោះនៅកន្លែងមានសុវត្ថិភាព។

## Smoke tests ក្រោយ Deploy

- Login ជា Employee ហើយ Check-in ដោយ QR/GPS ត្រឹមត្រូវ។
- សាក QR ខុស និង GPS ក្រៅ Radius — ត្រូវ Deny។
- Login ជា Kiosk ហើយបញ្ចូល PIN ត្រឹមត្រូវ — បង្ហាញ Employee តែម្នាក់។
- បញ្ចូល PIN ខុស 5 ដង — ត្រូវ Lock 15 នាទី។
- ព្យាយាម List `employees`, `attendanceToday`, `attendanceHistory` ជា Kiosk — ត្រូវ Deny។
- ព្យាយាម Read `settings/gpsQr` ជា Kiosk — ត្រូវ Deny។
- ពិនិត្យថា Attendance Record ដូចគ្នាមានទាំង `attendanceToday` និង `attendanceHistory`។
