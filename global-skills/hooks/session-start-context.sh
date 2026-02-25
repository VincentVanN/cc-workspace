#!/usr/bin/env bash
# session-start-context.sh
# SessionStart hook: injects active plan context and repo status.
# Stdout on exit 0 is added as context visible to Claude.
set -euo pipefail

cat > /dev/null
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
OUTPUT=""

# Find active plans (plans with pending ⏳ or in-progress 🔄 tasks)
if [ -d "$PROJECT_DIR/plans" ]; then
    ACTIVE_PLANS=$(find "$PROJECT_DIR/plans" -name '*.md' \
        ! -name '_TEMPLATE.md' \
        ! -name 'service-profiles.md' \
        -exec grep -l '⏳\|🔄' {} \; 2>/dev/null \
        | sort | tail -5)

    if [ -n "$ACTIVE_PLANS" ]; then
        FIRST_PLAN=""
        OUTPUT+="[Session context] Active plans with pending tasks:\n"
        while IFS= read -r plan; do
            PLAN_NAME=$(basename "$plan")
            [ -z "$FIRST_PLAN" ] && FIRST_PLAN="$PLAN_NAME"
            TODO=$(grep -c '⏳' "$plan" 2>/dev/null || echo "0")
            WIP=$(grep -c '🔄' "$plan" 2>/dev/null || echo "0")
            DONE=$(grep -c '✅' "$plan" 2>/dev/null || echo "0")
            OUTPUT+="  - $PLAN_NAME (⏳ $TODO pending, 🔄 $WIP in progress, ✅ $DONE done)\n"
        done <<< "$ACTIVE_PLANS"
        OUTPUT+="\nRead these plans to resume where you left off.\n"

        # Export active plan name to Claude's environment if supported
        if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "$FIRST_PLAN" ]; then
            echo "ACTIVE_PLAN=$FIRST_PLAN" >> "$CLAUDE_ENV_FILE"
        fi
    fi
fi

# Detect active sessions
SESSIONS_DIR="$PROJECT_DIR/.sessions"
if [ -d "$SESSIONS_DIR" ]; then
    ACTIVE_SESSIONS=""
    for session_file in "$SESSIONS_DIR"/*.json; do
        [ -f "$session_file" ] || continue
        SESSION_NAME=$(jq -r '.name // empty' "$session_file" 2>/dev/null) || continue
        SESSION_STATUS=$(jq -r '.status // "unknown"' "$session_file" 2>/dev/null) || continue
        [ "$SESSION_STATUS" != "active" ] && continue
        SESSION_REPOS=$(jq -r '[.repos | keys[]] | join(", ")' "$session_file" 2>/dev/null) || SESSION_REPOS="?"
        ACTIVE_SESSIONS+="  - $SESSION_NAME (repos: $SESSION_REPOS)\n"
    done
    if [ -n "$ACTIVE_SESSIONS" ]; then
        OUTPUT+="[Session context] Active sessions:\n$ACTIVE_SESSIONS"
        OUTPUT+="Session branches are already created. Teammates must use these branches.\n\n"
    fi
fi

# Check workspace.md exists
if [ ! -f "$PROJECT_DIR/workspace.md" ]; then
    OUTPUT+="[WARNING] No workspace.md found. Run setup-workspace.sh first.\n"
fi

# First-session detection
if [ -f "$PROJECT_DIR/workspace.md" ]; then
    if grep -q '\[UNCONFIGURED\]' "$PROJECT_DIR/workspace.md" 2>/dev/null; then
        OUTPUT+="[FIRST SESSION] workspace.md is not yet configured. Run: claude --agent workspace-init\n"
        OUTPUT+="Sibling repos detected:\n"
        PARENT_DIR="$(cd "$PROJECT_DIR/.." 2>/dev/null && pwd)"
        if [ -n "$PARENT_DIR" ] && [ -d "$PARENT_DIR" ]; then
            for dir in "$PARENT_DIR"/*/; do
                [ -d "$dir" ] || continue
                dir_name=$(basename "$dir")
                [ "$dir_name" = "$(basename "$PROJECT_DIR")" ] && continue
                [ -d "$dir/.git" ] && OUTPUT+="  - $dir_name\n"
            done
        fi
        OUTPUT+="\n"
    fi
fi

# Auto-discovery: detect new repos not in workspace.md
if [ -f "$PROJECT_DIR/workspace.md" ] && ! grep -q '\[UNCONFIGURED\]' "$PROJECT_DIR/workspace.md" 2>/dev/null; then
    PARENT_DIR="$(cd "$PROJECT_DIR/.." 2>/dev/null && pwd)"
    NEW_REPOS=""
    if [ -n "$PARENT_DIR" ] && [ -d "$PARENT_DIR" ]; then
        for dir in "$PARENT_DIR"/*/; do
            [ -d "$dir" ] || continue
            dir_name=$(basename "$dir")
            [ "$dir_name" = "$(basename "$PROJECT_DIR")" ] && continue
            if [ -d "$dir/.git" ] && ! grep -q "$dir_name" "$PROJECT_DIR/workspace.md" 2>/dev/null; then
                NEW_REPOS+="  - $dir_name\n"
            fi
        done
    fi
    if [ -n "$NEW_REPOS" ]; then
        OUTPUT+="[Auto-discovery] New repos detected (not in workspace.md):\n$NEW_REPOS\n"
    fi
fi

if [ -n "$OUTPUT" ]; then
    echo -e "$OUTPUT"
fi

exit 0
