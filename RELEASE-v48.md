# Borribo HRMS v48 — Organization Calendar

## Calendar

- Uses the actual current date instead of a fixed demo date.
- Combines public holidays, approved leave ranges, attendance summaries, employee birthdays, and organization events.
- Filters calendar data by branch, department, and record type.
- Shows month totals and a detailed day panel.
- Allows HR/Admin to create, edit, and delete multi-day organization events.
- Supports event scope for all staff or a selected branch/department.
- Uses a horizontally scrollable month grid on small screens.

## Deployment

Deploy the updated Firestore rules before creating calendar events:

```powershell
npx firebase-tools deploy --only "firestore:rules,firestore:indexes"
```

Firebase Storage and Blaze billing are not required for v48.
