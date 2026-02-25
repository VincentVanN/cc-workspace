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

### Commit planning (mandatory)

For EACH service, break tasks into **commit-sized units** (~300 lines max each):
- **Commit 1**: Data layer — models, migrations, DTOs, repositories
- **Commit 2**: Business logic — use cases, services, validation
- **Commit 3**: API/UI layer — controllers, routes, components, pages
- **Commit 4**: Tests for the above

Each commit unit in the plan must:
- Have a descriptive title (becomes the commit message)
- List the specific tasks it covers
- Estimate ~N files, ~N lines
- Be independently compilable and testable

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

## Phase 3: Spawn teammates (Agent Teams)

Use the **Teammate** tool to spawn teammates. Each teammate is an independent
Agent Teams session with its own context window.

### Teammate spawn template

For EVERY teammate, include in the spawn prompt:
1. Project-specific rules from `workspace constitution.md` (translated to English)
2. Their tasks from the plan
3. API contract (if applicable)
4. Instruction to read repo CLAUDE.md first
5. Instruction to escalate architectural decisions not in the plan
6. Session branch: `session/{name}` — tell the teammate this branch ALREADY EXISTS,
   all commits go on it, they must NOT create other branches

See @references/spawn-templates.md for the full templates per service type
(backend, frontend, infra, explore).

> **Constitution in spawn prompts**: Teammates do NOT receive the constitution
> automatically. You MUST include ALL rules from constitution.md in every spawn prompt.
> See @references/spawn-templates.md for templates.

### Frontend teammates — extra context

Before their tasks, inject:
- The UX standards (content of `references/frontend-ux-standards.md`)
- The exact API contract shapes for TypeScript interfaces

### API teammates — extra context

Inject:
- The API contract they must implement (exact shapes)
- Note that frontend will build types from these shapes

### Isolation

**Agent Teams teammates** (Teammate tool) get automatic worktree isolation —
no manual setup needed. Each teammate runs in its own git worktree.

**Task subagents** (Task tool, used for lightweight Explore/Haiku scans) do NOT
get automatic isolation. This is fine because Explore subagents are read-only.
If a Task subagent needs to write code, add `isolation: worktree` to its config.

Never mix: one teammate per repo per wave. No two teammates editing the same repo.

### Wave execution

1. Spawn all wave 1 teammates in parallel
2. Wait for ALL wave 1 to report back
3. Collect wave 1 results, update the API contract if needed
4. Spawn wave 2 teammates with validated contracts from wave 1
5. Repeat for wave 3 if applicable
6. Use **SendMessage** to clarify or redirect teammates mid-wave if needed

## Phase 4: Collect and update

On each teammate report:
1. Update `./plans/{feature-name}.md` — statuses ✅ or ❌ per commit unit
2. Update the **progress tracker** table (commits done / planned)
3. Note dead code found
4. Verify commit count and sizes — flag if a teammate made a single giant commit
4b. Verify commits are on the session branch (not on a rogue branch):
    - Spawn a Task subagent (Bash): `git -C ../[repo] log session/{name} --oneline -5`
    - If teammate committed on a different branch, flag it as a blocker
5. If a teammate failed → analyze, correct plan, re-dispatch
6. **Session log** entry: `[HH:MM] teammate-[service]: [status], [N] commits, [N] files, tests [pass/fail]`
7. If current wave done → launch next wave

## Phase 5: Post-implementation

1. Run `cross-service-check`
2. Run `qa-ruthless`
3. Update plan with all results
4. Present final status to user

## Mode D: Single-service

For targeted fixes or single-repo work:
1. Identify the ONE service to touch
2. Skip waves — spawn a single teammate
3. No cross-service-check (unless user requests it)
4. QA scoped to that service only
5. Merge prep for that service only

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
