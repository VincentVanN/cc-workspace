---
name: merge-prep
description: >
  Prepare branches for merge after QA passes. Checks for conflicts between
  teammate branches, generates PR summaries, lists review points.
  Use after qa-ruthless passes, or when user says "merge", "PR", "pull request",
  "prepare merge", "merge-prep", "ready to merge".
argument-hint: "[feature-name]"
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash, Task
---

# Merge Prep — Pre-Merge Checklist

You prepare the merge. You do NOT merge. You produce a merge readiness report.

## Phase 1: Collect branch info

1. Read `./workspace.md` for the service map
2. Read `./plans/{feature-name}.md` for the active plan
3. For each service with status ✅, identify the feature branch name

## Phase 2: Conflict detection

For each service with status ✅:
- Run `git -C ../[repo] log --oneline [target]..HEAD` to list commits on the feature branch
- Run `git -C ../[repo] diff --name-only [target]...HEAD` to list modified files
- Run `git -C ../[repo] fetch origin && git -C ../[repo] merge-base --is-ancestor origin/[target] HEAD` to check if up-to-date
- Cross-check: do any two branches modify the same shared files (types, configs, schemas)?
- Report potential merge conflicts

For lightweight read-only cross-checks, spawn Explore subagents (Task, Haiku).

## Phase 3: PR summary generation

For each service, generate a PR summary:

```markdown
### [service] — PR: feature/[name] → [target]

**Changes**: [N] files modified, [M] files created, [D] files deleted

**What changed**:
- [concise description of changes based on plan tasks]

**Key review points**:
- [specific areas that need human review attention]
- [any architectural decisions made during implementation]
- [constitution compliance notes]

**Tests**: [pass/fail status from QA]

**Dependencies**: [other PRs that must be merged first/after]
```

## Phase 4: Merge order

Determine the correct merge order based on dependency waves:
1. Wave 1 services (API, data, auth) merge first
2. Wave 2 services (frontend) merge after wave 1 is on target branch
3. Wave 3 services (infra) merge last

## Output

Write to `./plans/{feature-name}.md`:

```markdown
## Merge Prep — [DATE]

### Merge readiness
| Service | Branch | Up-to-date | Conflicts | Tests | Ready |
|---------|--------|-----------|-----------|-------|-------|
| [name] | feature/[x] | ✅/❌ | none/[list] | ✅/❌ | ✅/❌ |

### Merge order
1. [service] — [branch] → [target]
2. [service] — [branch] → [target]

### PR summaries
[per-service summaries]

### Blockers
[list or "none — ready to merge"]
```

Ask user: "Merge prep complete. [N] services ready. Proceed with PRs?"
