# Release v59 — Operations & Payroll Workflows

## Staff Loan
- Replaced direct browser writes with a Worker-backed approval workflow.
- Added pending, active, repaid, rejected and cancelled states.
- Added repayment history, automatic balance updates and automatic closure at zero balance.
- Added PDF/image attachments in Firebase Storage, with manager-only access and a 5 MB per-file limit.
- Added immutable audit entries for create, edit, decision, repayment, cancellation and payroll deduction.

## Asset Management
- Added create/edit, draft/submission/review workflow and manager comments.
- Added assignment and transfer history, stock returns and maintenance history.
- Added straight-line depreciation using purchase value, purchase date, useful life and salvage value.
- Material acquisition-value changes to an approved asset automatically require approval again.
- Retired/lost assets are preserved as lifecycle records instead of being hard-deleted.

## KPI
- Added monthly, quarterly and yearly evaluation cycles.
- Added KPI weights, draft/submission/approval/return workflow and weighted scoring.
- Enforced a maximum combined KPI weight of 100% for each employee, period and cycle.
- Added evaluation and immutable audit history.

## Payroll
- Added a basic payroll register with base salary, allowances, bonus, overtime, deductions, tax and Staff Loan deduction.
- Added draft, submission, approval, return and paid workflow.
- Added CSV export by payroll month.
- Enforced one payroll record per employee and month with a backend uniqueness reservation.
- Marking payroll paid records the Staff Loan deduction in the same atomic Firestore commit.

## Security and data integrity
- Browser clients can only read operational collections; all writes go through the authenticated Worker.
- Worker writes use Firestore update-time preconditions to detect concurrent edits.
- Added backend-only KPI-weight aggregate and payroll uniqueness collections.
- Operational actions write immutable Admin audit logs; records use soft lifecycle states rather than hard delete.

## Upgrade and deployment
1. Back up Firestore before upgrading.
2. Deploy Firestore and Storage rules:
   `npx firebase-tools deploy --only firestore:rules,storage`
3. Deploy the Worker before the frontend:
   `npm run deploy:telegram`
4. Verify the Worker URL in `VITE_TELEGRAM_WORKER_URL`.
5. Build and deploy the frontend:
   `npm run deploy`

No schema migration is required. Legacy Loan, Asset and KPI records remain readable; the first managed update adds the new workflow/history fields. Legacy Assets are treated as already approved so existing operations are not blocked.
