# Borribo HRMS v55 — Employee Account Lifecycle

## Included improvements

1. **Create a new Login Account**
   - Admin-only control in Employee Details.
   - Links the new Firebase UID to the existing Employee ID.
   - Rejects duplicate usernames and authentication emails.

2. **Automatic disable/reactivate**
   - Inactive employees cannot log in or use check-in.
   - Firebase Auth, Profile, Username, reset directory, and user directory are
     disabled or enabled together.
   - Existing sessions are blocked by the app, Worker, and Firestore rules.

3. **Rehire workflow**
   - Requires a rehire date.
   - Preserves the original Employee ID and all historical records.
   - Adds a new employment period and an employment-history entry.
   - Re-enables an existing Login Account; deleted accounts stay deleted until
     Admin creates a new one.

4. **Role permissions**
   - Admin manages all accounts and roles.
   - HR manages employee records and employee status, but cannot create or
     delete Login Accounts or manage HR/Admin accounts.
   - Employee users remain limited to their own portal data.

5. **Clear account statuses**
   - Not created (`none`)
   - Active (`active`)
   - Disabled (`disabled`)
   - Login deleted (`deleted`)

6. **Audit Log**
   - Records account creation, disable, re-enable, deletion, employee
     deactivation, and rehire.
   - Stores actor, target employee, time, role, and action context.
   - Browser users cannot forge, edit, or delete audit records.

## Safety

- Deleting a Login Account does not delete Employee, Attendance, Leave,
  Payroll, reporting, or employment-history data.
- The signed-in Admin cannot delete or deactivate their own account.
- Login Account creation and deletion are Admin-only.
