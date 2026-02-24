---
name: cross-service-check
description: >
  Validate technical consistency BETWEEN services. Does not review code
  quality (that's qa-ruthless). Checks: API contracts match frontend types,
  env vars synced, gateway routes match API, data schemas aligned.
  Use after teammates finish, before QA, or when user says "consistency",
  "cross-service", "aligned", "pre-merge".
argument-hint: "[feature-name]"
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Task
---

# Cross-Service Consistency Check

Scope: ONLY inter-service alignment. Not code quality, not bugs.

## Setup

Read `./workspace.md` for the service map.

## Checks (parallel Explore subagents via Task, Haiku)

Only run checks for services that exist in the workspace.
Spawn lightweight Explore subagents (Task tool, model: haiku) in parallel.
Use `background: true` so the orchestrator can continue interacting while scans run.

### API ↔ Frontend contract
Compare API Resource response shapes with TypeScript interfaces.
Report ONLY mismatches: field names, types, missing fields, route names.

### Environment variables
Cross-check env vars between all repos. Grep for env access patterns.
Compare with .env.example files. Report: used but not declared, declared but never used.

### Gateway ↔ API (if gateway exists)
Compare gateway config routes with actual API routes.
Report: dead gateway routes, missing routes for new endpoints.

### Data layer (if data service exists)
Compare data schemas with application code. Report: column/type mismatches, missing schema updates.

### Auth (if auth service was changed)
Compare auth config (client IDs, redirect URIs, scopes) between services. Report inconsistencies.

## Output

Write to `./plans/{feature-name}.md`:

```markdown
## Cross-Service Check — [DATE]

| Check | Status | Details |
|-------|--------|---------|
| API ↔ Frontend | ✅/❌ | [details] |
| Env vars | ✅/❌ | [details] |
| Gateway ↔ API | ✅/❌/— | [details] |
| Data layer | ✅/❌/— | [details] |
| Auth | ✅/❌/— | [details] |

### Blockers
[list or "none"]

### Warnings
[list or "none"]
```
