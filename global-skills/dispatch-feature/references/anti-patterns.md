# Dispatch Anti-Patterns

Reference file for dispatch-feature. Loaded on-demand when Claude needs reminders.

## NEVER do these

1. **NEVER write code in repos** — not even examples. You CAN write in orchestrator/
   (plans, workspace.md, constitution.md). For repo code: delegate without exception.
2. **NEVER skip clarify on ambiguous requests** — if in doubt, ask
3. **NEVER spawn one teammate for multiple repos** — one teammate = one repo = one wave
4. **NEVER skip the plan file** — everything is tracked on disk
5. **NEVER dispatch without approval** unless user explicitly said "autonome" or "go"
6. **NEVER forget UX standards in frontend teammate prompts** — they're in references/frontend-ux-standards.md
7. **NEVER launch wave 2 before wave 1 reports back** — contracts must be validated first
8. **NEVER let a teammate guess on architectural decisions** — they must escalate to you
9. **ALWAYS include the full constitution in spawn prompts** — all rules from
   constitution.md. Teammates do NOT receive it automatically.
10. **NEVER keep code details in your context** — summarize to 3 lines in the plan, then compact
11. **NEVER assume repos are listed in workspace.md** — scan `../` at feature start for
    any new `.git` repos that may have appeared since last configuration
12. **NEVER let teammates create their own branches** — they must use the session branch
    (`session/{name}`). The team-lead creates it during Phase 2.5.
13. **NEVER use `git checkout -b` in repos** — use `git branch {name} {source}` (no checkout).
    Checkout changes the working directory, which disrupts other sessions running in parallel.

## Common mistakes to watch for

| Mistake | Detection | Correction |
|---------|-----------|-----------|
| Teammate implements without reading CLAUDE.md | Report doesn't mention repo conventions | Re-dispatch with explicit instruction |
| Frontend teammate skips empty/error states | QA UX audit finds 🟣 violations | Re-dispatch with UX standards reminder |
| Plan has vague tasks like "implement feature" | Each task should have a clear input→output | Rewrite plan with specific tasks |
| API contract has `{}` placeholder | Frontend can't build types | Complete the contract shapes before wave 2 |
| Two teammates on same repo in same wave | Git conflicts guaranteed | Split into separate waves |
| Giant commit (500+ lines) | PR unreadable, impossible to review | Split into atomic commits (~300 lines max) per logical unit |
| Single commit at the end | All-or-nothing, no partial rollback | Commit after each logical unit — data, logic, API, tests |
| Task without commit boundary | Teammate guesses the split | Plan must define commit units per task |
| Teammate creates own branch | Report shows commits on `feature/xxx` instead of `session/xxx` | Re-dispatch with explicit session branch instruction |
| `git checkout -b` in repo | Other session's worktree on wrong branch | Always use `git branch` (no checkout) for session branch creation |
| No session created before dispatch | Branches mixed between parallel sessions | Always run Phase 2.5 before Phase 3 |
| Teammate reports done with 0 commits | Worktree cleaned up, changes LOST | Verify commits on session branch before accepting report |
| Teammate didn't checkout session branch | Commits on wrong branch or detached HEAD | Git workflow section must be FIRST in spawn prompt |
