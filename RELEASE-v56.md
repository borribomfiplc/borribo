# Borribo HRMS v56 — Add Employee Page Fix

## Fixed

- The **Add Employee** page no longer crashes when there is no editing employee.
- Account-status helpers now safely accept `null`, `undefined`, and empty data.
- A new employee without a Login Account correctly defaults to account status
  `none` (`មិនទាន់មានគណនី`).

## Verification

- Account-status null-safety checks passed.
- Production build passed.

