#!/usr/bin/env bash
# permission-auto-approve.sh
# PermissionRequest hook: auto-approves Read/Glob/Grep to reduce friction.
# Uses hookSpecificOutput JSON with decision.behavior: "allow".
set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || true

if echo "$TOOL_NAME" | grep -qE '^(Read|Glob|Grep)$'; then
    cat << 'EOF'
{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow","toolNames":["Read","Glob","Grep"]}}}
EOF
fi

exit 0
