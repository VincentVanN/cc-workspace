#!/usr/bin/env bash
# validate-spawn-prompt.sh
# PreToolUse hook (matcher: Teammate): validates that teammate spawn prompts
# contain the required context before allowing the spawn.
# v4.0: ALL checks are non-blocking warnings (exit 0 + stdout).
set -euo pipefail

INPUT=$(cat)

# Extract the spawn prompt from tool input
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty' 2>/dev/null) || true

if [ -z "$PROMPT" ]; then
    exit 0
fi

WARNINGS=""
BLOCKERS=""

# Check 1: Project-specific rules — require numbered rules (13., 14., etc.)
# or explicit section header, not just mention of the word "rules"
RULES_FOUND=0
if echo "$PROMPT" | grep -qiE '(## project rules|## non-negotiable|project-specific rules|rules spécifiques)' 2>/dev/null; then
    RULES_FOUND=1
fi
if echo "$PROMPT" | grep -qE '(1[3-9]\.|[2-9][0-9]\.).*\*\*' 2>/dev/null; then
    RULES_FOUND=1
fi
if echo "$PROMPT" | grep -qiE '(constitution|project rules)' 2>/dev/null && echo "$PROMPT" | grep -cqiE '(tenant|scoping|precision|rollback|feature flag)' 2>/dev/null; then
    RULES_FOUND=1
fi
if [ "$RULES_FOUND" -eq 0 ]; then
    BLOCKERS+="- Missing project-specific rules in spawn prompt. Include the project constitution rules (numbered rules from workspace constitution.md, translated to English).\n"
fi

# Check 2: Tasks section must be present with actual task content
if ! echo "$PROMPT" | grep -qiE '(your tasks|## tasks|assigned tasks|tâches|### tasks)' 2>/dev/null; then
    BLOCKERS+="- Missing tasks section in spawn prompt. Include the specific tasks from the plan.\n"
fi

# Check 3: CLAUDE.md instruction
if ! echo "$PROMPT" | grep -qiE '(CLAUDE\.md|read the repo|repo conventions|read.*conventions)' 2>/dev/null; then
    WARNINGS+="- Missing instruction to read repo CLAUDE.md.\n"
fi

# Check 4: Frontend teammates need UX standards — check for actual UX content
if echo "$PROMPT" | grep -qiE '(front|frontend|vue|quasar|nuxt|react|ui|ux)' 2>/dev/null; then
    UX_SIGNALS=0
    echo "$PROMPT" | grep -qiE '(4 (mandatory )?states|skeleton|empty state)' 2>/dev/null && UX_SIGNALS=$((UX_SIGNALS + 1))
    echo "$PROMPT" | grep -qiE '(responsive|mobile.first)' 2>/dev/null && UX_SIGNALS=$((UX_SIGNALS + 1))
    echo "$PROMPT" | grep -qiE '(accessib|aria.label|wcag)' 2>/dev/null && UX_SIGNALS=$((UX_SIGNALS + 1))
    echo "$PROMPT" | grep -qiE '(ux standard|error.state|loading.state)' 2>/dev/null && UX_SIGNALS=$((UX_SIGNALS + 1))
    if [ "$UX_SIGNALS" -lt 2 ]; then
        BLOCKERS+="- Frontend teammate detected but UX standards not sufficiently included (found $UX_SIGNALS/4 UX signals). Inject frontend-ux-standards content.\n"
    fi
fi

# Check 5: API teammates need contract shapes
if echo "$PROMPT" | grep -qiE '(api|backend|endpoint|rest|graphql)' 2>/dev/null; then
    if ! echo "$PROMPT" | grep -qiE '(contract|response shape|request shape|interface|payload|schema|GET /|POST /|PUT /|DELETE /)' 2>/dev/null; then
        WARNINGS+="- API teammate detected but no contract/shapes found in prompt. Consider including the API contract.\n"
    fi
fi

# Check 6: Escalation instruction
if ! echo "$PROMPT" | grep -qiE '(escalat|STOP and report|STOP and escalate|report.*dilemma|architectural decision)' 2>/dev/null; then
    WARNINGS+="- Missing escalation instruction. Include: 'If you hit an architectural decision NOT covered by the plan: STOP and escalate.'\n"
fi

# Check 7: Session branch instruction (if sessions exist)
SESSIONS_DIR="${CLAUDE_PROJECT_DIR:-.}/.sessions"
if [ -d "$SESSIONS_DIR" ] && ls "$SESSIONS_DIR"/*.json >/dev/null 2>&1; then
    if ! echo "$PROMPT" | grep -qiE '(session/|session branch|ALREADY EXISTS.*branch)' 2>/dev/null; then
        WARNINGS+="- Active sessions exist but no session branch found in spawn prompt. Include the session branch instruction.\n"
    fi
fi

# Report — ALL checks are warnings only (v4.0)
ISSUES=""
[ -n "$BLOCKERS" ] && ISSUES+="$BLOCKERS"
[ -n "$WARNINGS" ] && ISSUES+="$WARNINGS"

if [ -n "$ISSUES" ]; then
    echo -e "Spawn prompt validation warnings (non-blocking):\n$ISSUES"
fi

exit 0
