---
name: dispatch-feature
description: >
  Orchestrate multi-service feature implementation. Clarifies ambiguities
  before planning, writes a persistent markdown plan, spawns teammates
  in dependency waves with full context including constitution and UX standards.
  Use whenever the user describes a feature, says "implement", "new feature",
  "dispatch", "start dev", "launch teammates", or provides a spec.
argument-hint: "[feature description]"
context: fork
allowed-tools: Read, Write, Glob, Grep, Task, Teammate, SendMessage
---

# Dispatch Feature — Clarify, Plan, Delegate, Track

You produce ZERO code in repos. You clarify, plan, delegate, track.
You CAN write in orchestrator/ (plans, workspace.md, constitution.md).

## Mode detection

Before any phase, check which mode was selected:

| Mode | Behavior |
|------|----------|
| **A — Complet** | Run all phases 0-5 (default) |
| **B — Plan rapide** | Skip Phase 0 (Clarify). Start at Phase 2 with specs as-is. |
| **C — Go direct** | Skip Phases 0-2. Dispatch immediately from user specs. |
| **D — Single-service** | Phases 0-2, then spawn ONE teammate. No waves. |

If no mode specified, use Mode A.

## Phase 0: Clarify

Run through this checklist SILENTLY. Only ask for items you cannot deduce:

**Must-know** (block if missing):
- **Who** — which user type uses this feature?
- **What** — exact expected behavior (input → output)?
- **Where** — which services are impacted?
- **Data** — which entities/fields?

**Should-know** (ask if ambiguous):
- Error handling? Permissions? Trigger mechanism? Dependencies?

**Rules**: max 5 questions at once, formulated as concrete choices.
Skip clarify if: bug with log provided, or user says "go"/"autonome".

## Phase 1: Load context

1. Read `./workspace.md`
2. Read `./plans/service-profiles.md`
3. Read `./constitution.md` (project-specific rules)
4. Auto-discover repos: scan `../` for directories with `.git/` not in workspace.md
   → If new repos found: mention them, ask if relevant to this feature

> The constitution is defined in your workspace's constitution.md.
> Teammates do NOT receive it automatically. You MUST include all rules
> from constitution.md in every spawn prompt.

## Phase 2: Write the plan

Create `./plans/{feature-name}.md` using `./plans/_TEMPLATE.md`.
Include: context, clarification answers, services impacted, dependency waves,
detailed tasks per service, API contract (exact shapes), and autonomous choices if applicable.

### Commit planning (mandatory — each commit unit = one implementer spawn)

**CRITICAL**: Each commit unit in the plan becomes a separate `Task(implementer)` spawn.
The team-lead dispatches them sequentially per service. Size them accordingly:
- **Too granular** (10+ per service) = excessive spawns, slow, expensive
- **Too coarse** (1 giant unit) = defeats atomic commit purpose
- **Sweet spot**: 2-5 units per service, ~100-300 lines each

Typical split for a standard feature:
- **Commit 1**: Data layer — models, migrations, DTOs, repositories
- **Commit 2**: Business logic — use cases, services, validation
- **Commit 3**: API/UI layer — controllers, routes, components, pages
- **Commit 4**: Tests for the above

For a small fix: **1 single commit unit** (no unnecessary splitting).

| Service complexity | Recommended commit units |
|--------------------|--------------------------|
| Hotfix / bug fix | 1 |
| Small feature | 2-3 |
| Standard feature | 3-5 |
| Complex feature | 4-6 (max) |

Each commit unit in the plan must:
- Have a descriptive title (becomes the commit message)
- List the specific tasks it covers
- Estimate ~N files, ~N lines
- Be independently compilable and testable
- Be **self-contained enough for a fresh implementer** — an implementer that only sees
  the previous commits and this unit's description must be able to deliver it

The plan also includes a **progress tracker** table summarizing commits planned
vs done per service, visible at a glance.

### Dependency waves

- **Wave 1**: Producers — API backend, data/analytics, auth (define contracts)
- **Wave 2**: Consumers — Frontend, integrations (depend on wave 1 contracts)
- **Wave 3**: Infra/config — Gateway routes, deployment (after code exists)

Independent services go in the same wave. Save. **Present plan, wait for approval.**

## Phase 2.5: Session setup (branch isolation)

After plan approval and before dispatch:

1. Derive session name from feature name (slug: lowercase, hyphens, no spaces)
2. Read `./workspace.md` — extract the `Source Branch` column for each service
3. Identify repos impacted by the plan
4. Write `./.sessions/{session-name}.json`:
   ```json
   {
     "name": "{session-name}",
     "created": "{date}",
     "status": "active",
     "repos": {
       "{service}": {
         "path": "../{service}",
         "source_branch": "{from workspace.md}",
         "session_branch": "session/{session-name}",
         "branch_created": false
       }
     }
   }
   ```
5. Spawn a **Task subagent with Bash** to create branches in each impacted repo:
   ```
   git -C ../[repo] branch session/{name} {source_branch}
   ```
   - Use `git branch` — NOT `git checkout -b` (checkout disrupts other sessions)
   - If the branch already exists, verify it points to the right source and skip
   - The Task subagent reports success/failure per repo
6. Update the session JSON: set `branch_created: true` for each successful branch

> **Why a Task subagent?** The team-lead has `disallowedTools: Bash`.
> Branch creation requires shell access, so it must be delegated.

## Phase 3: Dispatch — one implementer per commit unit

**CRITICAL**: You do NOT spawn one teammate per service. You spawn one
`Task(implementer)` per **commit unit** in the plan. Each implementer handles
exactly one commit, then dies. This guarantees every commit is made.

### Dispatch flow per service (sequential)

```
For each service in the current wave:
  For each commit unit (in order):
    1. Spawn Task(implementer) with:
       - This commit unit's tasks ONLY
       - Constitution rules
       - API contract (if relevant)
       - Repo path + session branch
       - Context: "Commits 1..N-1 are already on the branch"
    2. Wait for implementer to return
    3. Verify commit on session branch (Task subagent with Bash)
    4. Update plan: mark commit unit ✅ or ❌
    5. If ❌: re-dispatch (max 2 retries), then escalate
    6. If ✅: proceed to next commit unit
```

**Cross-service parallelism**: Different services within the same wave can
progress in parallel. Use parallel Task calls when possible.

### Implementer spawn prompt — include for EVERY implementer

1. **Which commit unit** this is: "You are implementing Commit 3 of 4 for service api"
2. **Tasks for this commit only** (NOT the whole plan)
3. **Constitution rules** from constitution.md (translated to English)
4. **API contract** (if this commit involves API endpoints)
5. **Repo path** and **session branch**: `session/{name}`
6. **Previous context**: "Commits 1-2 are already on the branch (data layer + business logic).
   You handle Commit 3: API layer. Do NOT redo earlier work."
7. Instruction to read repo CLAUDE.md first
8. Instruction to escalate if hitting an architectural decision not in the plan

See @references/spawn-templates.md for the full templates per service type.

> **Constitution in spawn prompts**: Implementers do NOT receive the constitution
> automatically. You MUST include ALL rules from constitution.md in every spawn prompt.

### Frontend implementers — extra context

When the commit unit involves UI components, also include:
- The UX standards (content of `references/frontend-ux-standards.md`)
- The exact API contract shapes for TypeScript interfaces

### API implementers — extra context

When the commit unit involves API endpoints:
- The API contract they must implement (exact shapes)
- Note that frontend will build types from these shapes

### Isolation

Each `Task(implementer)` creates its own worktree in `/tmp/`. The worktree is
removed after the commit. The next implementer creates a fresh worktree and sees
all previous commits on the session branch.

Never run two implementers on the same repo simultaneously — sequential only.
Cross-service parallelism is fine.

### Wave execution

1. For each service in wave 1: dispatch commit units sequentially (parallel across services)
2. Wait for ALL services in wave 1 to complete ALL their commit units
3. Collect wave 1 results, update the API contract if needed
4. Dispatch wave 2 commit units with validated contracts from wave 1
5. Repeat for wave 3 if applicable

## Phase 4: Collect and update

After EACH implementer returns:
1. **Verify the commit** — spawn a Task subagent (Bash):
   `git -C ../[repo] log session/{name} --oneline -3`
   → The new commit must appear. If not: re-dispatch this commit unit.
2. Update `./plans/{feature-name}.md` — mark this commit unit ✅ or ❌
3. Update the **progress tracker** table (commits done / planned)
4. Note dead code found
5. **Flag giant commits** — if >400 lines, note in session log
6. **Session log** entry: `[HH:MM] impl-[service]-commit-[N]: [status], [hash], [N] files, tests [pass/fail]`
7. If ❌ → analyze failure, correct the commit unit description, re-dispatch (max 2 retries)
8. If all commit units for a service are ✅ → service complete
9. If all services in current wave are complete → launch next wave

## Phase 5: Post-implementation

1. Run `cross-service-check`
2. Run `qa-ruthless`
3. Update plan with all results
4. Present final status to user

## Mode D: Single-service

For targeted fixes or single-repo work:
1. Identify the ONE service to touch
2. Skip waves — dispatch commit units sequentially (often just 1)
3. No cross-service-check (unless user requests it)
4. QA scoped to that service only
5. Merge prep for that service only

For simple fixes with 1 commit unit: one Task(implementer) — no overhead.

> **Context note**: This skill runs with `context: fork`. After it completes,
> its internal context is discarded. The plan file on disk is the source of truth.
> QA and cross-service-check will reload the plan from disk.

## Session recovery

If resuming after crash:
1. Read `./workspace.md` for project context
2. List `./plans/` for active plans
3. Read active plan — statuses and session log tell you where you are
4. Resume at last incomplete step
5. If no mode was selected before crash, default to Mode A

## Anti-patterns

See @references/anti-patterns.md for the full list of anti-patterns and common mistakes.
