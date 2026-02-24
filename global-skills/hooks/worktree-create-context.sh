#!/usr/bin/env bash
# worktree-create-context.sh
# WorktreeCreate hook: logs worktree creation and reminds teammate to read repo CLAUDE.md.
# Parses stdin JSON to extract the worktree path for a specific reminder.
set -euo pipefail

INPUT=$(cat)

WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path // empty' 2>/dev/null) || true

if [ -n "$WORKTREE_PATH" ]; then
    echo "[WorktreeCreate] Worktree created at: $WORKTREE_PATH"
    if [ -f "$WORKTREE_PATH/CLAUDE.md" ]; then
        echo "Read $WORKTREE_PATH/CLAUDE.md first — follow its conventions."
    else
        echo "WARNING: No CLAUDE.md found in $WORKTREE_PATH. Check repo root or run bootstrap-repo."
    fi
else
    echo "[WorktreeCreate] Worktree created. Read the CLAUDE.md in the repo root first."
fi

exit 0
