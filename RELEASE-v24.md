# BORRIBO HRMS v24

កំណែនេះបន្ថែម និងកែ៖

- Firestore Rules តាមតួនាទី Admin / HR / Employee / Kiosk និងបិទការកែ
  attendance របស់បុគ្គលិកផ្សេង។
- GPS radius + accuracy check ទាំង Check-in និង Check-out។
- QR តាមសាខា មានថ្ងៃផុតកំណត់ និងរក្សា token ជា manager-only ខណៈ
  Employee អាចអានតែ SHA-256 hash។
- Camera QR scanner សម្រាប់ Chrome, Edge, Safari/iPhone និង Android browser។
- Attendance, Leave និង Monthly Report មាន date/month filter, CSV/Excel និង
  Print/Save PDF។
- Mobile responsive សម្រាប់ GPS/QR form, report filter/table, scanner modal,
  Topbar និង bottom navigation។
- កែ bug Leave Balance/Leave Type, empty employee list, missing Firestore ID,
  null search fields និង report zero values។
- Update Firebase Web SDK ដល់ 12.16.0; production dependency audit រកមិនឃើញ
  vulnerability។

## ដាក់ប្រើ

```powershell
npm install
npx firebase-tools deploy --only firestore:rules
npm run dev
```

បន្ទាប់ពី deploy rules រួច ចូលជា Admin/HR → **GPS និង QR** → ពិនិត្យ
Latitude/Longitude/Radius របស់គ្រប់សាខា → ចុច **រក្សាទុក** ម្តង។

បន្ទាប់ពីសាកល្បង local រួច៖

```powershell
git add .
git commit -m "Secure Firebase GPS QR and reports"
git push
```

កុំ push `.env`, `.env.local`, `serviceAccountKey.json`, `node_modules` ឬ
`dist`។

## សុវត្ថិភាព GPS/QR

Firestore Rules ការពារសិទ្ធិ និង ownership បាន។ GPS/QR validation នៅ browser
ជួយការប្រើប្រាស់ធម្មតា ប៉ុន្តែបើត្រូវការការពារការក្លែង GPS/QR កម្រិតខ្ពស់
ត្រូវបន្ថែម trusted server/Cloud Function និង Firebase App Check ក្នុងដំណាក់កាល
បន្ទាប់។
