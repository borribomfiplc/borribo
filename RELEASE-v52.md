# Borribo HRMS v52 — Multi-Branch GPS

## Added

- Every branch now stores its own Latitude, Longitude, and GPS radius.
- Branch GPS can be edited from either **Branches** or **GPS and QR**.
- Active branches receive separate expiring QR credentials and geofences.
- Employee mobile Check-in/out resolves the employee's stable `branchId`, then
  validates GPS distance and QR against that exact branch.
- Attendance records now store `branchId` and the verified branch/location.
- Kiosk accounts are bound to one branch. A kiosk accepts PINs only from staff
  assigned to its branch and validates its own GPS location before Check-in/out.
- Existing legacy GPS settings remain compatible and are synchronized into
  branch documents on the next GPS/QR save.
- The organization-ID migration now also updates profiles, users, and Firebase
  custom claims with stable branch IDs.

## Head-office default

The clean-install seed includes the confirmed head-office location:

```text
Latitude: 11.519935
Longitude: 104.9092321
Radius: 100 m
```

Existing production data is not overwritten. Confirm every active branch in
**Branches** or **GPS and QR**, then press Save.

## Deploy

```powershell
cd "C:\Users\hunrina\Desktop\BMI PROJECT\borribo"
npm install
npx firebase-tools deploy --only "firestore:rules"
npm run deploy:telegram
npm run dev
```

For an existing database, run this once if old profiles do not have `branchId`:

```powershell
npm run migrate-organization-ids
```

This migration requires the local `serviceAccountKey.json`. Never commit
`.env`, `serviceAccountKey.json`, or `telegram-worker/.dev.vars`.
