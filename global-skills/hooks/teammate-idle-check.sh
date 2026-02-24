#!/usr/bin/env bash
# teammate-idle-check.sh
# TeammateIdle hook
# Checks if unfinished tasks remain in active plans.
# NOTE: Uses CLAUDE_PROJECT_DIR to locate the workspace.
# If this hook runs in a teammate context where the plans/ directory is
# not accessible, it will harmlessly exit 0.
# v4.0: Warning only (exit 0). Never blocks.
set -euo pipefail

cat > /dev/null
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# Check for pending tasks in active plans
if [ -d "$PROJECT_DIR/plans" ]; then
    PENDING=$(find "$PROJECT_DIR/plans" -name '*.md' \
        ! -name '_TEMPLATE.md' \
        ! -name 'service-profiles.md' \
        -exec grep -l '⏳' {} \; 2>/dev/null)

    if [ -n "$PENDING" ]; then
        PLAN_NAMES=$(echo "$PENDING" | xargs -I{} basename {} | tr '\n' ', ' | sed 's/,$//')
        echo "[Warning] Unassigned tasks remain in: $PLAN_NAMES. Consider claiming the next pending task."
        exit 0
    fi
fi

# No pending tasks — teammate can go idle
exit 0
