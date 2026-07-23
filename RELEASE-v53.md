# Borribo HRMS v53 — Clear Login Users

- Adds `npm run clear-login-users`.
- Keeps one explicitly selected, verified Admin login.
- Deletes every other Firebase Authentication login.
- Removes matching `profiles`, `users`, `usernames`, and
  `passwordResetEmails` login-directory records.
- Detaches deleted logins from employee records without deleting employee or
  business data.
- Defaults to preview mode and requires `--confirm` before deletion.
- Refuses to run if the kept email is missing or is not verified as Admin.
