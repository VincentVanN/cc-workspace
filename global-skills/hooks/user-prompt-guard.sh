#!/usr/bin/env bash
# user-prompt-guard.sh
# UserPromptSubmit hook: conditionally reminds the orchestrator of its role.
# Only injects the reminder when the user prompt contains patterns suggesting
# a direct code request. This saves tokens on routine messages.
# Non-blocking (exit 0 + stdout = context injection).
set -euo pipefail

INPUT=$(cat)

# Extract the user prompt text from stdin JSON
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null) || true

# Only inject reminder if user prompt matches code-request patterns
if echo "$PROMPT" | grep -qiE '(dans le repo|dans [a-z-]+/|modifie.*repo|édite.*(api|front|light|spring|scraper|krakend|dashboard)|patch.*service)' 2>/dev/null; then
    echo "Role reminder: Writing in sibling repos is for teammates. You can write in orchestrator/ (plans, workspace.md, constitution.md). For repo changes, spawn a teammate."
fi

exit 0
