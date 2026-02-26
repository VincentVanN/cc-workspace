# Dispatch Anti-Patterns

Reference file for dispatch-feature. Loaded on-demand when Claude needs reminders.

## NEVER do these

1. **NEVER write code in repos** — not even examples. You CAN write in orchestrator/
   (plans, workspace.md, constitution.md). For repo code: delegate without exception.
2. **NEVER skip clarify on ambiguous requests** — if in doubt, ask
3. **NEVER spawn one implementer for multiple commit units** — one implementer = one commit.
   The whole point of atomic dispatch is that each implementer does ONE thing and commits.
4. **NEVER skip the plan file** — everything is tracked on disk
5. **NEVER dispatch without approval** unless user explicitly said "autonome" or "go"
6. **NEVER forget UX standards in frontend implementer prompts** — they're in references/frontend-ux-standards.md
7. **NEVER launch wave 2 before wave 1 completes ALL commit units** — contracts must be validated first
8. **NEVER let an implementer guess on architectural decisions** — they must escalate to you
9. **ALWAYS include the full constitution in spawn prompts** — all rules from
   constitution.md. Implementers do NOT receive it automatically.
10. **NEVER keep code details in your context** — summarize to 3 lines in the plan, then compact
11. **NEVER assume repos are listed in workspace.md** — scan `../` at feature start for
    any new `.git` repos that may have appeared since last configuration
12. **NEVER let implementers create their own branches** — they must use the session branch
    (`session/{name}`). The team-lead creates it during Phase 2.5.
13. **NEVER use `git checkout -b` in repos** — use `git branch {name} {source}` (no checkout).
    Checkout changes the working directory, which disrupts other sessions running in parallel.
14. **NEVER skip commit verification** — after each implementer returns, verify the commit
    exists on the session branch before spawning the next implementer.
15. **NEVER over-split commit units** — 10+ commit units per service is excessive.
    Each spawn has overhead (worktree setup, CLAUDE.md read, context load). Sweet spot: 2-5.

## Common mistakes to watch for

| Mistake | Detection | Correction |
|---------|-----------|-----------|
| Implementer doesn't read CLAUDE.md | Report doesn't mention repo conventions | Re-dispatch with explicit instruction |
| Frontend implementer skips empty/error states | QA UX audit finds 🟣 violations | Re-dispatch with UX standards reminder |
| Plan has vague tasks like "implement feature" | Each task should have a clear input→output | Rewrite plan with specific tasks |
| API contract has `{}` placeholder | Frontend can't build types | Complete the contract shapes before wave 2 |
| Two implementers on same repo simultaneously | Git conflicts guaranteed | Always sequential within a service |
| Giant commit (500+ lines) | PR unreadable | Consider splitting into more commit units in the plan |
| Commit unit too granular (< 20 lines) | Overhead > value | Merge with adjacent commit unit |
| Commit unit not self-contained | Implementer can't understand scope without full plan | Rewrite: each unit must be understandable with only previous context |
| Implementer redoes work from earlier commits | Files from commit 1 modified in commit 3 | Add "What previous commits did" section to spawn prompt |
| No commit in implementer report | Implementer forgot to commit | Verify on branch, re-dispatch if needed |
| Implementer creates own branch | Report shows commits on `feature/xxx` | Re-dispatch with session branch instruction |
| `git checkout -b` in repo | Other session's worktree on wrong branch | Always use `git branch` (no checkout) |
| No session created before dispatch | Branches mixed between parallel sessions | Always run Phase 2.5 before Phase 3 |
