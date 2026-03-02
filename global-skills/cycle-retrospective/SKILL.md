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

## Phase 2: Extract data (Haiku collectors)

Spawn parallel Explore subagents (Task, model: haiku) to extract and structure raw data from the plan. Each collector: "Extract and structure the data. Do NOT analyze patterns or suggest improvements."

### QA data extractor
Parse the QA report section from the plan.
Return: raw list of findings with category (🔴/🟡/🟠/🔵/🟣), file reference, and description. No analysis.

### Session log extractor
Parse the session log section from the plan.
Return: raw list of escalations, re-dispatches, and blockers with timestamps or phase references. No analysis.

### Cross-service data extractor
Parse the cross-service check results section from the plan.
Return: raw list of checks with status and details. No analysis.

## Phase 3: Analyze patterns (Opus reasoning)

After all collectors return, YOU (the skill) analyze the raw data. This is where the reasoning model (Opus) works:
- Group findings by category and identify recurring patterns across cycles
- Correlate escalations with plan quality — what was missing from the plan?
- Identify what could have been prevented by a rule or convention
- Generate concrete improvement suggestions for each finding category

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
