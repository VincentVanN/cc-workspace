#!/usr/bin/env bash
# worktree-create-context.sh
# WorktreeCreate hook: reminds teammate to read repo CLAUDE.md.
# Messages go to stderr so stdout doesn't pollute the worktree path.
set -euo pipefail

INPUT=$(cat)

WORKTREE_PATH=$(echo "$INPUT" | jq -r '.worktree_path // empty' 2>/dev/null) || true

if [ -n "$WORKTREE_PATH" ]; then
    if [ -f "$WORKTREE_PATH/CLAUDE.md" ]; then
        echo "Read $WORKTREE_PATH/CLAUDE.md first — follow its conventions." >&2
    else
        echo "WARNING: No CLAUDE.md found in $WORKTREE_PATH. Check repo root or run bootstrap-repo." >&2
    fi
else
    echo "Read the CLAUDE.md in the repo root first." >&2
fi

exit 0
