#!/usr/bin/env bash
# session-start-context.sh
# SessionStart hook: injects active plan context, repo status, and cleans orphan worktrees.
# Stdout on exit 0 is added as context visible to Claude.
set -euo pipefail

cat > /dev/null
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
OUTPUT=""

# ── Orphan worktree cleanup ──────────────────────────────────
# Clean /tmp/ worktrees that were left behind by crashed implementers.
# These are safe to remove: they're temporary by design.
ORPHAN_COUNT=0
for wt in /tmp/*-session-* /tmp/e2e-* 2>/dev/null; do
    [ -d "$wt" ] || continue
    # Check if the worktree is registered with any repo
    REPO_FOUND=0
    PARENT_DIR="$(cd "$PROJECT_DIR/.." 2>/dev/null && pwd)" || continue
    for repo_dir in "$PARENT_DIR"/*/; do
        [ -d "$repo_dir/.git" ] || continue
        if git -C "$repo_dir" worktree list 2>/dev/null | grep -q "$wt"; then
            # Worktree is registered — check if it's stale (no git lock, no recent activity)
            if [ ! -f "$wt/.git" ]; then
                # Not a valid worktree anymore — remove registration
                git -C "$repo_dir" worktree remove "$wt" --force 2>/dev/null && ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
                REPO_FOUND=1
                break
            fi
            REPO_FOUND=1
            break
        fi
    done
    if [ "$REPO_FOUND" -eq 0 ] && [ -d "$wt/.git" ] || [ -f "$wt/.git" ]; then
        # Unregistered worktree directory — likely a crash remnant. Remove it.
        rm -rf "$wt" 2>/dev/null && ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
    fi
done
if [ "$ORPHAN_COUNT" -gt 0 ]; then
    OUTPUT+="[Cleanup] Removed $ORPHAN_COUNT orphan worktree(s) from /tmp/.\n"
fi

# ── Active plans ─────────────────────────────────────────────
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

        if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "$FIRST_PLAN" ]; then
            echo "ACTIVE_PLAN=$FIRST_PLAN" >> "$CLAUDE_ENV_FILE"
        fi
    fi
fi

# ── Active sessions ──────────────────────────────────────────
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

# ── Workspace check ──────────────────────────────────────────
if [ ! -f "$PROJECT_DIR/workspace.md" ]; then
    OUTPUT+="[WARNING] No workspace.md found. Run setup-workspace.sh first.\n"
fi

# ── First-session detection ──────────────────────────────────
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

# ── Auto-discovery: new repos ────────────────────────────────
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
