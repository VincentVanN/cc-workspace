#!/usr/bin/env bash
# task-completed-check.sh
# TaskCompleted hook: reminds teammates to verify tests/dead code/constitution.
# TeammateIdle/TaskCompleted use stderr for feedback (stdout is ignored).
set -euo pipefail

INPUT=$(cat)

# Extract task output if available
TASK_OUTPUT=$(echo "$INPUT" | jq -r '.task_output // empty' 2>/dev/null) || true

# Check for explicit failure signals across common test runners
if echo "$TASK_OUTPUT" | grep -qiE '(tests?\s*fail|FAIL(ED|URES?)|error.*test|test.*error|ERRORS?:|failures?:|AssertionError|exit\s*code\s*[1-9])' 2>/dev/null; then
    echo "[Warning] Tests appear to have failed. Verify before marking complete." >&2
fi
echo "Task completion checklist: 1) Verify tests passed 2) Check for dead code 3) Verify constitution compliance." >&2
exit 0
