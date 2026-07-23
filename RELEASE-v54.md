# Borribo HRMS v54 — Delete Login Account

- Adds a permanent **Delete Login Account** control to the employee edit page.
- Shows the control only to Admin users and only for employees with a linked account.
- Prevents the signed-in Admin from deleting their own account.
- Requires typing `DELETE` before the destructive action is enabled.
- Deletes Firebase Authentication, profile, username, password-reset directory,
  and user-directory records.
- Detaches the login from the employee record without deleting employee,
  attendance, leave, payroll, or reporting history.
- Records the security action in an immutable `auditLogs` entry.
