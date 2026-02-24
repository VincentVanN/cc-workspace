---
name: plan-review
description: >
  Quick sanity check on a plan before the user validates it. Verifies
  structural completeness: all tasks have a service, waves respect
  dependencies, API contract has concrete shapes, no orphan tasks.
  Use when a plan was just written or user says "review plan", "vérifie le plan".
argument-hint: "[plan-name.md]"
context: fork
agent: Explore
disable-model-invocation: true
model: haiku
allowed-tools: Read, Glob, Grep
---

# Plan Review — Sanity Check

You review a plan for structural completeness. You do NOT review code.

## Steps

1. Read the plan file from `./plans/`
2. Read `./workspace.md` for the service map

## Checklist

### Structure
- [ ] Every task has a service assigned
- [ ] Every impacted service has at least one task
- [ ] Wave assignments respect dependencies (producers before consumers)
- [ ] No service appears in two waves simultaneously
- [ ] One teammate per repo per wave — never two on the same repo

### Contracts
- [ ] API contract has concrete response shapes (not just `{}`)
- [ ] Field names and types are explicit
- [ ] Error response shapes are defined
- [ ] If frontend tasks exist, they reference the API contract

### Constitution compliance
- [ ] Multi-tenant scoping mentioned if data access is involved
- [ ] Test requirements mentioned per task
- [ ] Rollback strategy mentioned if migrations exist
- [ ] Feature flag mentioned if ClickHouse/irreversible changes exist

### Scale
- [ ] No single service has more than 15 tasks (risk of context overflow for teammate)
- [ ] Total plan size is under 500 lines (if larger, consider splitting into sub-plans)
- [ ] API contract shapes are concrete but not bloated (no full DB schemas)
- [ ] No duplicate tasks across waves (check for copy-paste from previous iterations)
- [ ] No near-identical task descriptions within the same service

### Completeness
- [ ] Context section explains the "why"
- [ ] Clarification answers are recorded (if clarify happened)
- [ ] Session log has at least a creation entry

## Output

```
## Plan Review — [PLAN NAME]

✅ Passed: [list]
⚠️ Warnings: [list]
❌ Failed: [list — these MUST be fixed before dispatch]

Recommendation: [APPROVE / FIX REQUIRED]
```

If all checks pass: "Plan looks solid. Ready for dispatch."
If critical issues: list them and suggest specific fixes.
