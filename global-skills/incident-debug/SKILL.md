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

## Phase 2: Collect evidence (parallel Haiku extractors)

Spawn parallel Explore subagents (Task, model: haiku) per layer. Each one collects raw evidence — code snippets, log entries, config values, error messages — and returns them WITHOUT diagnosis.

Include this instruction in every collector prompt: "Collect RAW EVIDENCE only. Code snippets with file:line references. Do NOT diagnose or hypothesize. Do NOT say 'the problem is X'. Just return what you found."

Use these patterns to guide collectors on WHERE to look (not to diagnose):

| Signal | Where to collect |
|--------|-----------------|
| HTTP 500 in controller | Use `go-to-definition` (or Grep+Glob fallback) to find controller method → service layer → repository/query. Return code snippets with file:line. |
| Type mismatch frontend | Use `find-references` on the TypeScript interface → collect all usage sites. Return raw code. |
| Auth loop / 401 | Find auth middleware and token validation logic. Return raw config and code snippets. |
| N+1 query suspicion | Find the relationship method and all callers. Return raw code at each call site. |
| Dead import / unused function | Use `find-references` → return reference count and locations. |
| Unknown error class | Find the exception class definition and all catch blocks. Return raw code. |

### Per-layer collector prompts

- **API/Backend collector**: Find error handlers, relevant controller/service code, recent log patterns, middleware chain. Use Grep+Glob to trace the call chain from the entry point. Return: relevant code snippets with file:line, error handling logic, middleware order.
- **Frontend collector**: Find component rendering logic, API call code, error boundaries, console error patterns. Return: component tree around the error, API call implementations, error handling code.
- **Gateway collector** (if applicable): Extract route config, upstream definitions, timeout settings. Return raw config.
- **Auth collector** (if applicable): Extract token validation logic, middleware config, redirect URIs. Return raw code snippets.
- **Infra collector** (if applicable): Extract container configs, health checks, resource limits, recent deployment changes. Return raw config.

## Phase 3: Diagnose (Opus reasoning)

After all collectors return, YOU (the skill) correlate the evidence:
- Build the request flow timeline from the collected code and config
- Cross-reference findings between layers to identify where the chain breaks
- Identify the root cause based on the evidence — this is deep reasoning, not pattern matching
- The model running this skill (Opus) is the one that diagnoses; collectors never diagnose

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
