#!/usr/bin/env bash
# task-completed-check.sh
# TaskCompleted hook: reminds teammates to verify tests/dead code/constitution.
# Exit 0 + stdout = inject reminder as context (non-blocking, v4.0).
set -euo pipefail

INPUT=$(cat)

# Extract task output if available
TASK_OUTPUT=$(echo "$INPUT" | jq -r '.task_output // empty' 2>/dev/null) || true

# Check for explicit failure signals across common test runners
# PHPUnit: FAILURES!, ERRORS!, Tests: X, Failures: Y
# pytest/vitest/jest: FAILED, failed, ✗, Error
# Pest (Laravel): FAIL, Tests: X, X failed
# Generic: exit code non-zero indicators, AssertionError (Python), AssertionError (various)
if echo "$TASK_OUTPUT" | grep -qiE '(tests?\s*fail|FAIL(ED|URES?)|error.*test|test.*error|ERRORS?:|failures?:|AssertionError|exit\s*code\s*[1-9])' 2>/dev/null; then
    echo "[Warning] Tests appear to have failed. Verify before marking complete."
fi
echo "Task completion checklist: 1) Verify tests passed 2) Check for dead code 3) Verify constitution compliance."
exit 0
