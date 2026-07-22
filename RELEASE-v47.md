# Borribo HRMS v47 — Leave Calculation & Organization

## Leave request

- Calculates and displays total leave days immediately after selecting start/end dates.
- Counts start and end dates inclusively; half-day leave is stored as 0.5 day.
- Prevents an end date earlier than the start date.
- Disables new Firebase Storage uploads so the free setup remains usable.
- Sick leave over one day asks the employee to hand the medical document to HR.
- HR/Admin can mark a medical document as received or not received.

## Organization

- Adds an organization-structure overview for branches, departments, roles, and active employees.
- Adds employee transfer/job-change workflow across branch, department, and role.
- Saves an immutable organization-change audit history.
- Adds active/inactive controls for branches, departments, and job roles instead of destructive deletion.
- Keeps the existing branch attendance summary and organization setup pages.

## Deployment

Deploy the updated Firestore rules before using organization transfers:

```powershell
npx firebase-tools deploy --only "firestore:rules,firestore:indexes"
```

Firebase Storage and Blaze billing are not required for v47.
