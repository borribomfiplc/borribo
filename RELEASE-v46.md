# Borribo HRMS v46 — Leave Management

## Approval flow

Employee → HR/Admin

## Included

- Employee self-service leave requests with full-day and half-day options.
- Annual, sick, personal, maternity, and unpaid leave types.
- Automatic day calculation, overlap prevention, and balance validation.
- Medical document requirement for sick leave longer than one day.
- Private PDF/image attachment storage (maximum 5 MB).
- Pending-request cancellation by the employee.
- HR/Admin approval or rejection with an audit reason and decision identity.
- Approved leave is written to attendance history and today's attendance.
- Leave balance, request register, status filters, and CSV export.
- Telegram hooks for request and decision notifications.

## Required Firebase rules deployment

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Cloudflare Pages still uses the same `.env` / `VITE_FIREBASE_*` variables as v45.
