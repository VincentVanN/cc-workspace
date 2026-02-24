#!/usr/bin/env bash
# track-file-modifications.sh
# PostToolUse hook (async): logs modified files for merge-prep.
# Matcher: Write|Edit|MultiEdit
# Appends to .claude/modified-files.log
set -euo pipefail

INPUT=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/.claude/modified-files.log"

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null) || true

if [ -n "$FILE_PATH" ]; then
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "$(date +%Y-%m-%dT%H:%M:%S) $FILE_PATH" >> "$LOG_FILE"
fi

exit 0
