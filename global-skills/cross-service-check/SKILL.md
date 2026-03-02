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

1. Read `./workspace.md` for the service map
2. Check `./.sessions/` for the active session related to the current feature
   - If a session exists, all checks MUST run against the **session branch**
     (e.g., `session/feature-auth`), not against `main` or the default branch
   - Use `git -C ../[repo] show session/{name}:[file]` to read files from the
     session branch without checking it out

## Phase 1 — Gather (Haiku data extractors)

Only run extractors for services that exist in the workspace.
Spawn parallel Explore subagents (Task tool, model: haiku) using `background: true`.
Each extractor returns RAW DATA ONLY — no judgment, no ✅/❌, no comparisons.

Include this instruction in every extractor prompt: "Return RAW DATA ONLY. Do NOT judge, compare, or produce conclusions. No ✅/❌. Just structured lists of what you found." Format: structured markdown with clear headings and tables.

### API extractor
Extract all API endpoint response shapes from backend code.
Return: route, method, response fields and types. One row per field.

### Frontend extractor
Extract all TypeScript interfaces/types that represent API responses.
Return: interface name, fields and types, which endpoint they map to (if determinable).

### Env extractor
Extract env var declarations (.env.example) and usages (grep for process.env / import.meta.env / getenv / os.Getenv / etc.) from ALL repos.
Return: declared vars per repo (from .env.example), used vars per repo (from code grep).

### Gateway extractor (if gateway exists)
Extract all gateway route configs.
Return: path, upstream, method for each route.

### Data extractor (if data service exists)
Extract schema definitions (table name, columns, types) and application model definitions.
Return: raw schema table and raw model fields side by side.

### Auth extractor (if auth service was changed)
Extract auth configs (client IDs, redirect URIs, scopes) from each service.
Return: raw config values per service.

## Phase 2 — Reason (this skill, running as Opus)

After all extractors return, YOU compare the datasets side-by-side and produce final judgments:

- **API shapes vs Frontend interfaces**: field mismatches, type mismatches, missing fields
- **Env declarations vs env usages**: used-but-undeclared, declared-but-unused (per repo)
- **Gateway routes vs API routes**: dead routes, missing routes for new endpoints
- **Data schemas vs application models**: column/type drift
- **Auth configs across services**: inconsistencies between client configs

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
