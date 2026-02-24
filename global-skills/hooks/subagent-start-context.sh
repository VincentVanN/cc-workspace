#!/usr/bin/env bash
# subagent-start-context.sh
# SubagentStart hook: injects active plan + constitution reference into each subagent.
# Stdout is added as additionalContext for the subagent.
set -euo pipefail

cat > /dev/null
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
OUTPUT=""

# Inject active plan context
if [ -d "$PROJECT_DIR/plans" ]; then
    ACTIVE_PLAN=$(find "$PROJECT_DIR/plans" -name '*.md' \
        ! -name '_TEMPLATE.md' \
        ! -name 'service-profiles.md' \
        ! -name 'retro-*.md' \
        -exec grep -l '⏳\|🔄' {} \; 2>/dev/null \
        | sort | head -1)

    if [ -n "$ACTIVE_PLAN" ]; then
        PLAN_NAME=$(basename "$ACTIVE_PLAN")
        OUTPUT+="[Subagent context] Active plan: $PLAN_NAME\n"
        OUTPUT+="Read $ACTIVE_PLAN for your assigned tasks.\n"
    fi
fi

# Remind about constitution
if [ -f "$PROJECT_DIR/constitution.md" ]; then
    OUTPUT+="[Project constitution] Non-negotiable rules in $PROJECT_DIR/constitution.md — read and follow.\n"
fi

OUTPUT+="[Reminder] Report back: files changed, tests pass/fail, dead code found, blockers.\n"

echo -e "$OUTPUT"
exit 0
