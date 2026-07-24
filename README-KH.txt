BORRIBO HRMS v64 — Data Integrity និងការកែបញ្ហាតូចៗពី v61

v64 រួមបញ្ចូលការកែ Critical ទាំង 15 របស់ v63 និងបន្ថែម៖
- Version និងឆ្នាំ copyright sync ដោយស្វ័យប្រវត្តិ
- សារ Auto-lock បង្ហាញរយៈពេលពិត
- Settings មិន overwrite default ពេល load បរាជ័យ
- Dark Mode ស្អាត និងមិនប៉ះ hover styles
- Reports submenu និង Notification panel ស្អាតជាងមុន
- Asset Maintenance អាចកែ និងមិនរាប់ចំណាយស្ទួន
- Error ពី download/save/delete បង្ហាញដល់អ្នកប្រើ

បើ Upgrade ដោយផ្ទាល់ពី v61 សូម Backup Firestore ហើយដំណើរការ៖
  1. npm ci
  2. npm run migrate-attendance
  3. npm run migrate-organization-ids
  4. npm run deploy:telegram
  5. npm run build
  6. npm run deploy
  7. npx firebase-tools deploy --only firestore:rules

ត្រូវ Deploy Worker និង Frontend v64 មុន Firestore rules ថ្មី។
បន្ទាប់ពី Deploy សូម Hard Refresh ហើយ reload/reinstall PWA។

បើអ្នកបានប្រើ v63 រួចហើយ មិនត្រូវការ migration ឬ deploy rules ទេ។
Deploy Worker មុន Frontend ព្រោះ Maintenance edit ប្រើ Worker action ថ្មី។

ព័ត៌មានលម្អិតសូមមើល RELEASE-v63.md និង RELEASE-v64.md។
