---
name: cycle-retrospective
description: >
  Post-cycle learning and knowledge capture. Analyzes QA findings, teammate
  reports, and implementation patterns to improve repo CLAUDE.md files,
  service profiles, and project constitution. Run after a successful cycle
  (dispatch → QA → merge). Use when user says "retro", "rétrospective",
  "capitalize", "lessons learned", "what did we learn", "improve docs".
argument-hint: "[feature-name]"
context: fork
agent: general-purpose
disable-model-invocation: true
model: haiku
allowed-tools: Read, Write, Glob, Grep, Task
---

# Cycle Retrospective — Continuous Learning

After a complete cycle (dispatch → QA → merge), capture lessons learned
and propagate improvements to project documentation.

## Phase 1: Gather data

1. Read `./workspace.md` for the service map
2. Find the most recent completed plan in `./plans/` (status ✅ or all tasks ✅)
3. Read the plan including:
   - QA report section (findings, patterns)
   - Cross-service check results
   - Session log (blockers, escalations, re-dispatches)

## Phase 2: Analyze patterns

Spawn parallel Explore subagents (Task, Haiku) to categorize findings:

### Recurring QA findings
- Group QA findings by category (🔴 bugs, 🟡 smells, 🟠 dead code, 🔵 missing tests, 🟣 UX violations)
- Identify patterns: same type of issue across multiple cycles?
- Flag findings that could have been prevented by a rule or convention

### Teammate friction
- Parse session log for escalations — what decisions weren't covered by the plan?
- Parse for re-dispatches — what went wrong on first attempt?
- Parse for idle time — were tasks too large or poorly scoped?

### Cross-service gaps
- Were there contract mismatches? Missing env vars? Schema drift?
- Could these have been caught earlier by a convention?

## Phase 3: Generate improvements

For each finding category, generate concrete improvement suggestions:

### CLAUDE.md updates (per repo)
For each impacted repo, suggest additions to its CLAUDE.md:
- New conventions discovered during implementation
- Common pitfalls to document
- Test patterns that should be standard
- Architecture decisions made during this cycle

Format:
```markdown
### Suggested additions for [repo]/CLAUDE.md

#### Conventions (new)
- [convention discovered]

#### Pitfalls (new)
- [pitfall encountered]

#### Patterns (new)
- [pattern to follow]
```

### Constitution updates
If a finding reveals a gap in the project constitution:
```markdown
### Suggested constitution rule
**[Rule number]. [Rule name].** [Description based on what went wrong]
Triggered by: [QA finding or escalation that revealed the gap]
```

### Service profiles updates
If repo conventions changed, note what needs updating in service-profiles.md.

## Phase 4: Write retrospective

Create `./plans/retro-{date}.md`:

```markdown
# Retrospective — [Feature name] — [DATE]

## Cycle summary
- **Feature**: [name]
- **Services**: [list]
- **QA findings**: 🔴[n] 🟡[n] 🟠[n] 🔵[n] 🟣[n]
- **Escalations**: [n]
- **Re-dispatches**: [n]

## Recurring patterns
| Pattern | Occurrences | Category | Preventable? |
|---------|------------|----------|-------------|
| [pattern] | [n] | [category] | [yes/no + how] |

## Suggested improvements

### CLAUDE.md updates
[per-repo suggestions]

### Constitution updates
[if any]

### Process improvements
[if any — e.g., "add X to plan template", "add Y to QA checklist"]

## Actions
- [ ] Update [repo]/CLAUDE.md with [changes]
- [ ] Update constitution with rule [N]
- [ ] Update service-profiles.md
- [ ] Update plan template with [addition]
```

## Phase 5: Present and confirm

Present the retrospective to the user. Ask:
"Retrospective complete. [N] improvements suggested. Apply changes to CLAUDE.md files?"

If user confirms, spawn teammates to apply the CLAUDE.md updates to each repo.
Do NOT auto-apply constitution changes — those require human review.

## Anti-patterns
- NEVER fabricate findings — only report what's in the actual plan and QA data
- NEVER modify repo code — only documentation files (CLAUDE.md, service-profiles)
- NEVER auto-apply constitution changes without user approval
- Keep suggestions actionable and specific — "improve error handling" is too vague
