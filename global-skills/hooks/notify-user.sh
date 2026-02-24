#!/usr/bin/env bash
# notify-user.sh
# Notification hook: sends desktop notification when Claude needs attention.
# Works on macOS (osascript), Linux (notify-send), and falls back to terminal bell.
set -euo pipefail

INPUT=$(cat)

MESSAGE=$(echo "$INPUT" | jq -r '.message // "Claude Code needs your attention"' 2>/dev/null) || MESSAGE="Claude Code needs your attention"
TITLE="Claude Code Orchestrator"

# Sanitize message for safe shell interpolation (strip quotes, backslashes, special chars)
SAFE_MESSAGE=$(printf '%s' "$MESSAGE" | tr -d '"\\\n' | head -c 200)
SAFE_TITLE=$(printf '%s' "$TITLE" | tr -d '"\\\n')

# Try macOS notification — use positional args to avoid injection
if command -v osascript &>/dev/null; then
    osascript -e 'on run argv' \
              -e 'display notification (item 1 of argv) with title (item 2 of argv)' \
              -e 'end run' \
              -- "$SAFE_MESSAGE" "$SAFE_TITLE" 2>/dev/null || true
# Try Linux notification
elif command -v notify-send &>/dev/null; then
    notify-send -- "$SAFE_TITLE" "$SAFE_MESSAGE" 2>/dev/null || true
fi

# Always ring terminal bell as fallback
printf '\a' 2>/dev/null || true

exit 0
