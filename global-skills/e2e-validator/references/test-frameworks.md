# Test Frameworks — E2E Validator Reference

## Framework detection

Scan each repo for these markers:

| Framework | Detection files | Run command |
|-----------|----------------|-------------|
| PHPUnit | `phpunit.xml`, `phpunit.xml.dist` | `php artisan test` or `./vendor/bin/phpunit` |
| Pest (PHP) | `phpunit.xml` + `pest` in composer.json | `php artisan test --pest` |
| Jest | `jest.config.*`, `"jest"` in package.json | `npx jest` or `npm test` |
| Vitest | `vitest.config.*`, `"vitest"` in package.json | `npx vitest run` |
| Playwright | `playwright.config.*` | `npx playwright test` |
| Cypress | `cypress.config.*`, `cypress/` dir | `npx cypress run` |
| Pytest | `pytest.ini`, `pyproject.toml` with `[tool.pytest]`, `conftest.py` | `pytest` |
| Go test | `*_test.go` files | `go test ./...` |
| Cargo test | `Cargo.toml` + `#[test]` in src | `cargo test` |

## Headless API test patterns

### cURL-based assertions

```bash
#!/bin/bash
# E2E test: {scenario-name}
# Generated from plan: {plan-name}

BASE_URL="${API_URL:-http://localhost:8000}"
PASS=0
FAIL=0

assert_status() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS: $description (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_json() {
  local description="$1"
  local jq_filter="$2"
  local expected="$3"
  local response="$4"
  local actual
  actual=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo "  PASS: $description ($actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description (expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

# --- Test cases ---

# Test: Create resource
echo "Testing: Create resource"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"field": "value"}')
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/resource" "201" "$STATUS"
assert_json "Response has id" ".data.id" "not-null" "$BODY"

# Test: Validation error
echo "Testing: Validation error"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/resource" \
  -H "Content-Type: application/json" \
  -d '{}')
STATUS=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/resource (invalid)" "422" "$STATUS"

# Test: Unauthorized
echo "Testing: Unauthorized access"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/resource")
assert_status "GET /api/resource (no auth)" "401" "$STATUS"

# --- Summary ---
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

### Authentication helpers

```bash
# Get auth token (adapt per project)
get_token() {
  local email="${1:-test@example.com}"
  local password="${2:-password}"
  curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$email\", \"password\": \"$password\"}" \
    | jq -r '.token // .data.token // .access_token'
}

TOKEN=$(get_token)
```

### Database seeding

```bash
# Seed test data before running E2E tests
seed_test_data() {
  local repo_type="$1"
  case "$repo_type" in
    "PHP/Laravel")
      docker compose exec api php artisan db:seed --class=TestSeeder
      ;;
    "Node.js")
      docker compose exec api npm run seed:test
      ;;
    "Python")
      docker compose exec api python manage.py seed_test_data
      ;;
  esac
}
```

## Chrome test scenario format

Chrome scenarios are described in markdown, read by the agent, and executed
step-by-step using chrome-devtools MCP tools.

### Scenario file template: `./e2e/chrome/scenarios/{plan}/{scenario}.md`

```markdown
# Scenario: {name}
> Plan: {plan-name}
> Route: /path/to/page
> Prerequisites: authenticated user, seeded data

## Steps

### 1. Navigate
- URL: http://localhost:9000/path
- Wait for: selector ".page-title" OR text "Page Title"
- Screenshot: 01-page-loaded.png

### 2. Fill form
- Fields:
  - input[name="client"]: "ACME Corp"
  - input[name="amount"]: "1500.00"
  - select[name="status"]: "draft"
  - textarea[name="notes"]: "Test note"
- Screenshot: 02-form-filled.png

### 3. Submit
- Click: button[type="submit"]
- Wait for: selector ".toast-success" (timeout: 5s)
- Screenshot: 03-submitted.png
- Assert network: POST /api/resource → 201
- Assert console: no errors

### 4. Verify in list
- Navigate: http://localhost:9000/resources
- Wait for: text "ACME Corp"
- Screenshot: 04-in-list.png

### 5. Responsive
- Resize: 375x812
- Screenshot: 05-mobile.png
- Resize: 1280x720

## UX State checks
- Loading: navigate with throttled network → skeleton visible?
- Empty: clear all data → CTA visible?
- Error: kill API → error + retry button?
```

## Existing E2E framework integration

### If Playwright is detected
```bash
# Run existing Playwright tests inside the container or locally
cd /tmp/e2e-frontend
npx playwright install chromium  # ensure browser is available
npx playwright test --reporter=json > /tmp/playwright-results.json

# Parse results
PASS=$(jq '.stats.expected' /tmp/playwright-results.json)
FAIL=$(jq '.stats.unexpected' /tmp/playwright-results.json)
```

### If Cypress is detected
```bash
cd /tmp/e2e-frontend
npx cypress run --browser chromium --reporter json > /tmp/cypress-results.json

PASS=$(jq '.stats.passes' /tmp/cypress-results.json)
FAIL=$(jq '.stats.failures' /tmp/cypress-results.json)
```

### If no E2E framework exists
Fall back to:
1. cURL-based API tests (always available)
2. Chrome-devtools for UI tests (when --chrome flag)
3. Suggest adding Playwright to the project in the report
