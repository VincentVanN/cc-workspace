#!/usr/bin/env bash
# track-file-modifications.sh
# PostToolUse hook (async): logs modified files for merge-prep.
# Matcher: Write|Edit|MultiEdit
# Appends to .claude/modified-files.log in orchestrator/ only.
# Skips silently if CLAUDE_PROJECT_DIR is unset (teammate worktree context).
set -euo pipefail

INPUT=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}"

# Skip if not in orchestrator context
if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR/.claude" ]; then
    exit 0
fi

LOG_FILE="$PROJECT_DIR/.claude/modified-files.log"

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null) || true

if [ -n "$FILE_PATH" ]; then
    echo "$(date +%Y-%m-%dT%H:%M:%S) $FILE_PATH" >> "$LOG_FILE"
fi

exit 0
