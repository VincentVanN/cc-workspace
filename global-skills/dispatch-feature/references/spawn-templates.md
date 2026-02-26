# Implementer Spawn Templates

Reference file for dispatch-feature. Loaded on-demand, not at skill activation.

> Each implementer handles exactly ONE commit unit. The team-lead spawns
> implementers sequentially per service — one per commit unit in the plan.
> Implementers do NOT receive the constitution automatically. Every spawn
> template below includes a "Constitution" section that you MUST fill with
> all rules from your workspace's `constitution.md`.

## Backend/API implementer spawn template

```
You are implementer for [service], handling Commit [N] of [total]: [commit title].
Commits 1 to [N-1] are already on the session branch. Do NOT redo earlier work.

Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

CRITICAL: Do NOT run `git checkout` in the main repo. Do NOT use `git -C ../repo checkout`.
You are already in an isolated worktree — all git commands run HERE, not in the main repo.

1. FIRST THING: Switch to the session branch inside your worktree:
   git checkout session/{session-name}
   (This is safe — you are in a worktree, not the main repo)
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. If checkout fails with "did not match any file(s)":
   git fetch origin session/{session-name}
   git checkout session/{session-name}
4. Check existing commits: git log --oneline -5

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## API contract
[paste the exact request/response shapes relevant to THIS commit]
[note: frontend will build TypeScript interfaces from these shapes]

## Your single commit unit
[paste ONLY the tasks for this specific commit unit — NOT the whole plan]

## What previous commits already did
[brief summary: "Commit 1 added models X, Y, Z. Commit 2 added services A, B."]

## Instructions
1. Read the repo CLAUDE.md first — follow its conventions
2. Implement ONLY the tasks above — do not touch code from earlier commits
3. Use the LSP tool for code navigation (go-to-definition, find-references)
4. Run the existing test suite — report pass/fail
5. List any dead code created or exposed by your changes
6. If your changes exceed ~300 lines, split into multiple commits
   (data → logic → API layer), each compilable
7. If you hit an architectural decision NOT covered by the plan: STOP and
   report the dilemma instead of guessing
8. COMMIT before reporting. Run: git status (must be clean), git log --oneline -3
   (your commit must appear)
9. Report back: commit hash + message, files created/modified, tests pass/fail,
   dead code found, blockers
```

## Frontend implementer spawn template

```
You are implementer for [service], handling Commit [N] of [total]: [commit title].
Commits 1 to [N-1] are already on the session branch. Do NOT redo earlier work.

Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

CRITICAL: Do NOT run `git checkout` in the main repo. Do NOT use `git -C ../repo checkout`.
You are already in an isolated worktree — all git commands run HERE, not in the main repo.

1. FIRST THING: Switch to the session branch inside your worktree:
   git checkout session/{session-name}
   (This is safe — you are in a worktree, not the main repo)
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. If checkout fails with "did not match any file(s)":
   git fetch origin session/{session-name}
   git checkout session/{session-name}
4. Check existing commits: git log --oneline -5

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## UX Standards (non-negotiable)
[paste full content of frontend-ux-standards.md — only if this commit involves UI components]

## API contract (TypeScript interfaces)
[paste exact response shapes relevant to THIS commit]

## Your single commit unit
[paste ONLY the tasks for this specific commit unit — NOT the whole plan]

## What previous commits already did
[brief summary: "Commit 1 added types/interfaces. Commit 2 added store/composables."]

## Instructions
1. Read the repo CLAUDE.md first — follow its conventions
2. Implement ONLY the tasks above — do not touch code from earlier commits
3. Use the LSP tool for code navigation
4. If this commit adds components: MUST handle 4 states (skeleton, empty+CTA, error+retry, success)
5. Run the existing test suite — report pass/fail
6. List any dead code (unused components, composables, store actions, CSS)
7. If your changes exceed ~300 lines, split into multiple commits
   (types → store → components → pages), each compilable
8. If you hit an architectural decision NOT covered by the plan: STOP and escalate
9. COMMIT before reporting. Run: git status (must be clean), git log --oneline -3
   (your commit must appear)
10. Report back: commit hash + message, files created/modified, tests pass/fail,
    dead code found, UX compliance, blockers
```

## Infra/Config implementer spawn template

```
You are implementer for [service], handling Commit [N] of [total]: [commit title].
Commits 1 to [N-1] are already on the session branch. Do NOT redo earlier work.

Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

CRITICAL: Do NOT run `git checkout` in the main repo. Do NOT use `git -C ../repo checkout`.
You are already in an isolated worktree — all git commands run HERE, not in the main repo.

1. FIRST THING: Switch to the session branch inside your worktree:
   git checkout session/{session-name}
   (This is safe — you are in a worktree, not the main repo)
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. If checkout fails with "did not match any file(s)":
   git fetch origin session/{session-name}
   git checkout session/{session-name}
4. Check existing commits: git log --oneline -5

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## Your single commit unit
[paste ONLY the tasks for this commit — typically gateway routes, configs, env vars]

## What previous commits already did
[brief summary if applicable]

## Instructions
1. Read the repo CLAUDE.md first
2. Implement ONLY the configuration changes for this commit
3. Verify consistency with other services (env vars, routes, schemas)
4. No application code changes — only configuration
5. Commit message format: `chore(service): description`
6. If you hit an architectural decision NOT covered by the plan: STOP and escalate
7. COMMIT before reporting. Run: git status (must be clean), git log --oneline -3
   (your commit must appear)
8. Report back: commit hash + message, files modified, consistency check results, blockers
```

## Explore/Haiku subagent template (read-only)

Use `Task` with `subagent_type: Explore` and `model: haiku` for lightweight scans.

```
You are an explorer scanning [target]. Read-only — do NOT modify any files.

## Task
[specific read-only investigation task]

## Report format
[what to extract and how to format the findings]
```

## Failure handling

When an implementer reports back:
- **Test regression or missing file** (recoverable): fix commit unit description, re-dispatch ONCE
- **Architectural decision not in plan** (blocking): STOP the wave, escalate to user
- **No commit in report**: the implementer forgot to commit. Verify on session branch
  with a Task subagent. If no commit exists, re-dispatch with emphasis on committing.
- **Max re-dispatches per commit unit**: 2. After that, escalate to user.
- **Giant commit (>400 lines)**: note in session log, consider splitting in future plans
