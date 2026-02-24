---
name: incident-debug
description: >
  Debug incidents across a multi-service stack. Spawns parallel
  investigators per layer. Use when user reports a bug, says "erreur",
  "500", "bug", "debug", "ça marche pas", "investigate", or pastes
  stack traces or error logs. Also French triggers: "erreur", "ça marche pas".
argument-hint: "[error description or stack trace]"
context: fork
allowed-tools: Read, Write, Glob, Grep, Task, Teammate, SendMessage
---

# Incident Debug — Multi-Layer Investigation

You investigate. You do NOT fix. You produce a diagnosis.

## Phase 1: Triage

Read `./workspace.md` for the service map.
Parse the user's report for signals:

| Signal | Start with |
|--------|-----------|
| HTTP 4xx/5xx | API layer |
| JS error / white screen | Frontend |
| Auth loop / 401/403 | Auth + middleware |
| Slow / timeout | DB + gateway |
| Wrong data | Data layer + API |
| 502/503 | Infra |

If unclear, investigate all layers.

## Phase 2: Investigate (parallel)

Spawn investigators via Agent Teams (Teammate tool):
- **API/Backend**: full Sonnet teammate with write-capable investigation. Use the **LSP tool** (go-to-definition, find-references) to trace error call chains
- **Frontend, Gateway, Infra, Auth**: lightweight Explore subagents (Task, Haiku) for read-only scan. Use LSP tool where available for tracing

Multiple teammates can share findings and challenge each other's hypotheses.
This adversarial pattern finds root causes faster than sequential investigation.

### LSP investigation patterns

Instruct investigators to use these specific LSP workflows:

| Signal | LSP action |
|--------|-----------|
| HTTP 500 in controller | `go-to-definition` on the controller method → trace into service layer → trace into repository/query |
| Type mismatch frontend | `find-references` on the TypeScript interface → verify all usages match the API shape |
| Auth loop / 401 | `hover` on auth middleware → verify configuration → `find-references` on token validation |
| N+1 query suspicion | `find-references` on the relationship method → check all callers for eager loading |
| Dead import / unused function | `find-references` → if 0 references outside tests, flag as dead code |
| Unknown error class | `go-to-definition` on the exception class → check parent hierarchy and catch blocks |

## Phase 3: Correlate

Build request flow timeline with ✅/❌ markers.
Cross-reference findings between layers.

## Phase 4: Write diagnosis

Create `./plans/incident-{date}-{name}.md`:

```markdown
# Incident: [title]
> Date: [DATE] | Severity: 🔴/🟡/🟢

## Symptôme
[what the user sees]

## Request timeline
[flow with pass/fail markers]

## Root cause
[explanation with file:line evidence]

## Fix plan
| # | Service | Action | File | Complexity |
|---|---------|--------|------|------------|

## Regression prevention
- Test: [description]
- Monitoring: [alert/metric]
```

Ask: "Diagnosis complete. Dispatch fixes?"
