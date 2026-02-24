---
description: Proactive context management to prevent pollution and slowdown. Applies to the orchestrator session (not to teammates — they manage their own context).
globs: ["workspace.md", "plans/**", "constitution.md", "templates/**"]
---

# Context Hygiene

> These rules target the **orchestrator** session. Teammates manage their own context
> independently. If you are a teammate reading this, you can ignore these rules.

## After each teammate report
- Summarize the report in 3 lines max in the markdown plan
- Do NOT keep code details in your context
- Only status (✅/❌) and critical findings persist

## Response limits
- No code in repos — delegate repo code to teammates
- Writing in orchestrator/ (plans, workspace.md, constitution.md) is allowed and expected
- Teammate results: summarize to status + files + problems, then compact

## Compaction
- Context compaction triggers automatically (Opus 4.6 adaptive)
- Additionally, compact manually after each full cycle
  (plan → teammates → collect → QA)
- Also compact when responses visibly slow down

## Triggers for /clear
- Switching to a completely different feature/epic
- After merging a completed feature
- Start of day / new work session

## Monitoring
- The `SessionStart` hook automatically injects active plan context
  at startup or after a `/clear`
- If a config issue is suspected, use `/hooks` to inspect

## Context compaction (Opus 4.6)
- Opus 4.6 supports native context compaction — the model can summarize
  its own context to continue longer-running tasks without hitting limits
- The 1M context window (beta) is available but token-intensive.
  Disable with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` if cost is a concern
- For orchestration sessions, prefer compact-after-cycle over 1M context:
  smaller context = faster responses = cheaper
