# Scenario Extraction — E2E Validator Reference

How to read a completed plan and extract testable E2E scenarios.

## Plan anatomy (what to extract from)

A plan (`./plans/{feature-name}.md`) contains these key sections:

### 1. Context section → **user stories**
```markdown
## Context
Users need to create and manage devis (quotes) for their clients.
A devis has: client, items, total, status (draft/sent/accepted/rejected).
```
**Extract**: The primary user action and the data model involved.

### 2. Clarifications → **edge cases**
```markdown
## Clarifications
- Q: What happens when a devis is empty? A: Show validation error
- Q: Can a sent devis be edited? A: No, only draft devis
```
**Extract**: Validation rules, state transitions, permission constraints.

### 3. API contract → **endpoint tests**
```markdown
## API contract
POST /api/devis
  Request: { client_id: int, items: [{desc: string, qty: int, price: float}] }
  Response 201: { data: { id: int, reference: string, total: float, status: "draft" } }
  Response 422: { errors: { client_id: ["required"], items: ["required"] } }
```
**Extract**: Every endpoint + request/response shape + error codes.

### 4. Tasks per service → **what was built**
```markdown
### frontend
#### Commit 1: DevisForm component
- ✅ Create DevisForm with client selector, item lines, totals
- ✅ Add form validation (inline errors)
```
**Extract**: UI components created/modified → Chrome test targets.

### 5. Impacted services → **which repos to test**
```markdown
## Impacted services
| Service | Session Branch | Status |
|---------|----------------|--------|
| api     | session/devis  | ✅     |
| front   | session/devis  | ✅     |
```
**Extract**: Which repos to checkout and test.

## Extraction algorithm

### Step 1: Identify the feature scope
Read Context + Clarifications → answer:
- What is the user trying to do?
- What are the success criteria?
- What are the failure modes?

### Step 2: Map API scenarios
From the API contract, generate one test per:
- **Happy path**: valid request → expected response code + shape
- **Validation errors**: missing/invalid fields → 422 with error details
- **Auth errors**: no token / wrong role → 401/403
- **Not found**: invalid ID → 404
- **Business rules**: state violations (e.g., edit sent devis) → 409/422

### Step 3: Map Chrome scenarios (if --chrome)
From Tasks (frontend section), generate one scenario per:
- **Main flow**: navigate → fill → submit → verify
- **Validation flow**: submit empty form → see inline errors
- **State transitions**: draft → send → cannot edit
- **UX states**: loading, empty, error, success (4 mandatory states)
- **Responsive**: each main page at 375x812

### Step 4: Cross-service scenarios
From the API contract + frontend tasks, generate integration tests:
- Frontend submits → API receives correct payload
- API returns → Frontend displays correctly
- API error → Frontend shows error state
- Network failure → Frontend shows retry

## Output: scenario list

After extraction, write scenarios to `./e2e/chrome/scenarios/{plan}/`:

```
scenarios/
  devis/
    01-create-devis.md          ← happy path
    02-validation-errors.md     ← form validation
    03-devis-list.md            ← list + pagination
    04-devis-status-flow.md     ← draft → sent → accepted
    05-responsive.md            ← mobile layouts
    06-ux-states.md             ← loading/empty/error/success
```

Each file follows the scenario template from `test-frameworks.md`.

## Priority order

When time is limited, test in this order:
1. **API happy paths** (always — fastest, catches regressions)
2. **API error cases** (always — catches missing validation)
3. **Chrome main flow** (if --chrome — catches integration bugs)
4. **Chrome validation** (if --chrome — catches UX gaps)
5. **UX state audit** (if --chrome — catches constitution violations)
6. **Responsive** (if --chrome — catches layout breaks)
7. **Cross-service edge cases** (time permitting)

## Example: extracting from a real plan

Given this plan excerpt:
```markdown
## Context
Add expense tracking: users create expenses with receipt upload,
manager approves/rejects.

## API contract
POST /api/expenses
  Request: { amount: float, description: string, receipt: file }
  Response 201: { data: { id, status: "pending" } }
DELETE /api/expenses/:id
  Response 204 (only if status=pending)
  Response 409 (if status!=pending)
PATCH /api/expenses/:id/approve (manager only)
  Response 200: { data: { status: "approved" } }
  Response 403 (if not manager)
```

**Extracted API tests**:
1. `POST /api/expenses` with valid data → 201
2. `POST /api/expenses` without receipt → 422
3. `POST /api/expenses` without auth → 401
4. `DELETE /api/expenses/:id` (pending) → 204
5. `DELETE /api/expenses/:id` (approved) → 409
6. `PATCH /api/expenses/:id/approve` as manager → 200
7. `PATCH /api/expenses/:id/approve` as user → 403

**Extracted Chrome tests**:
1. Navigate to /expenses/new → form with file upload visible
2. Fill form + upload receipt → submit → toast + redirect to list
3. Submit empty form → inline validation errors
4. List page → see new expense with "pending" badge
5. Manager view → approve button visible → click → status changes
6. User view → no approve button
7. Loading state → skeleton on list page
8. Empty state → "No expenses yet" + CTA
9. Mobile → /expenses responsive at 375px
