#!/usr/bin/env bash
# guard-session-checkout.sh
# PreToolUse hook (matcher: Bash): blocks `git checkout session/` in main repos.
# Session branches must only be checked out INSIDE worktrees, never in main repos
# (doing so disrupts other parallel sessions).
# v4.2.1: hard guardrail — this hook BLOCKS (exit 0 + deny JSON).
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null) || true

[ -z "$COMMAND" ] && exit 0

# Only care about git checkout/switch targeting session/ branches
if ! echo "$COMMAND" | grep -qE 'git\s+(checkout|switch)\s+.*session/' 2>/dev/null; then
    exit 0
fi

# Pattern 1: git -C <repo> checkout session/ — always wrong (targets main repo from outside)
if echo "$COMMAND" | grep -qE 'git\s+-C\s+\S+\s+(checkout|switch)\s+.*session/' 2>/dev/null; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: git checkout session/ with -C targets the main repo directly. This disrupts other parallel sessions. You are in a worktree — run `git checkout session/{name}` from INSIDE your worktree (without -C) instead. If you are not in a worktree, something is wrong with your isolation setup."}}'
    exit 0
fi

# Pattern 2: git checkout session/ without -C — check if we are in a main repo
# In a worktree, .git is a FILE (gitdir pointer). In a main repo, .git is a DIRECTORY.
if [ -d ".git" ] && [ ! -f ".git" ]; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: git checkout session/ detected in a main repo (not a worktree). Checking out a session branch in the main repo disrupts other parallel sessions. You must work in an isolated worktree. If you are a teammate, your worktree should already exist — run `git checkout session/{name}` from inside it."}}'
    exit 0
fi

# We are in a worktree (.git is a file) — allow the checkout
exit 0
