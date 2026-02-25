# Teammate Spawn Templates

Reference file for dispatch-feature. Loaded on-demand, not at skill activation.

> Teammates do NOT receive the constitution automatically. Every spawn template
> below includes a "Constitution" section that you MUST fill with all rules from
> your workspace's `constitution.md`.

## Backend/API teammate spawn template

```
You are teammate-[service]. Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

1. FIRST THING: check out the session branch:
   git checkout session/{session-name}
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. Commit AFTER EACH logical unit — do NOT wait until the end
4. Before reporting back, verify ALL changes are committed:
   git status  (must show: nothing to commit, working tree clean)
5. If git status shows uncommitted changes when you're done: COMMIT THEM NOW

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## API contract
[paste the exact request/response shapes this service must implement]
[note: frontend will build TypeScript interfaces from these shapes]

## Your tasks
[paste tasks from plan for this service]

## Instructions
1. Read the repo CLAUDE.md first — follow its conventions
2. Implement the tasks above following the full constitution (all rules above)
3. Use the LSP tool for code navigation (go-to-definition, find-references)
4. Run the existing test suite — report pass/fail
5. List any dead code created or exposed by your changes
6. **Atomic commits** — follow the commit plan below
7. If you hit an architectural decision NOT covered by the plan: STOP and
   report the dilemma instead of guessing
8. **Before reporting back**: run `git status` — if anything is uncommitted, commit it NOW
9. Report back: files created/modified, tests pass/fail, dead code found,
   commits made (hash + message), blockers

## Commit strategy (mandatory)
- **One commit per logical unit** — each task in "Your tasks" = one commit minimum
- **Max ~300 lines per commit** — if a task produces more, split it:
  1. Data layer first (models, migrations, DTOs, repositories)
  2. Business logic (use cases, services, validation)
  3. API layer (controllers, routes, requests)
  4. Tests for the above
- **Commit message format**: `feat(domain): description` or `fix(domain): description`
- **Each commit must compile and pass tests** — no broken intermediate states
- **Commit as you go** — do NOT accumulate all changes for a single final commit
```

## Frontend teammate spawn template

```
You are teammate-[service]. Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

1. FIRST THING: check out the session branch:
   git checkout session/{session-name}
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. Commit AFTER EACH logical unit — do NOT wait until the end
4. Before reporting back, verify ALL changes are committed:
   git status  (must show: nothing to commit, working tree clean)
5. If git status shows uncommitted changes when you're done: COMMIT THEM NOW

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## UX Standards (non-negotiable)
[paste full content of frontend-ux-standards.md]

## API contract (TypeScript interfaces)
[paste exact response shapes from wave 1 — teammate builds TS interfaces from these]

## Your tasks
[paste tasks from plan for this service]

## Instructions
1. Read the repo CLAUDE.md first — follow its conventions
2. Implement the tasks following the full constitution (all rules above) and UX standards
3. Use the LSP tool for code navigation
4. Every new component MUST handle 4 states: skeleton loader, empty+CTA, error+retry, success
5. Run the existing test suite — report pass/fail
6. List any dead code (unused components, composables, store actions, CSS)
7. **Atomic commits** — follow the commit plan below
8. If you hit an architectural decision NOT covered by the plan: STOP and escalate
9. **Before reporting back**: run `git status` — if anything is uncommitted, commit it NOW
10. Report back: files created/modified, tests pass/fail, dead code found,
    UX compliance, commits made (hash + message), blockers

## Commit strategy (mandatory)
- **One commit per logical unit** — each task = one commit minimum
- **Max ~300 lines per commit** — if a task produces more, split it:
  1. Types/interfaces and API service layer
  2. Store/composables (state management)
  3. Components (one commit per complex component)
  4. Page integration + routing
  5. Tests for the above
- **Commit message format**: `feat(domain): description` or `fix(domain): description`
- **Each commit must compile and pass tests** — no broken intermediate states
- **Commit as you go** — do NOT accumulate all changes for a single final commit
```

## Infra/Config teammate spawn template

```
You are teammate-[service]. Read the CLAUDE.md in your repo first.

## Git workflow (CRITICAL — read first)
You are working in a temporary worktree. If you don't commit, YOUR WORK WILL BE LOST
when the worktree is cleaned up.

1. FIRST THING: check out the session branch:
   git checkout session/{session-name}
2. Verify you are on the right branch:
   git branch --show-current  (must show: session/{session-name})
3. Commit AFTER EACH logical unit — do NOT wait until the end
4. Before reporting back, verify ALL changes are committed:
   git status  (must show: nothing to commit, working tree clean)
5. If git status shows uncommitted changes when you're done: COMMIT THEM NOW

Branch `session/{session-name}` ALREADY EXISTS. Do NOT create other branches.

## Constitution (non-negotiable)
[paste all rules from your workspace's constitution.md]

## Your tasks
[paste tasks — typically: gateway routes, deployment configs, env vars]

## Instructions
1. Read the repo CLAUDE.md first
2. Implement the configuration changes following the full constitution
3. Verify consistency with other services (env vars, routes, schemas)
4. No code changes — only configuration
5. **Atomic commits** — one commit per logical config change
6. Commit message format: `chore(service): description`
7. If you hit an architectural decision NOT covered by the plan: STOP and escalate
8. **Before reporting back**: run `git status` — if anything is uncommitted, commit it NOW
9. Report back: files modified, consistency check results,
   commits made (hash + message), blockers
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

When a teammate reports back:
- **Test regression or missing file** (recoverable): fix plan, re-dispatch ONCE
- **Architectural decision not in plan** (blocking): STOP the wave, escalate to user
- **No report after extended time**: send a status request via SendMessage
- **Max re-dispatches per teammate per wave**: 2. After that, escalate to user.
- **0 commits reported**: the teammate likely forgot to commit. Check the worktree
  with a Task subagent before accepting the report. If changes exist uncommitted,
  re-dispatch with explicit instruction to commit.
