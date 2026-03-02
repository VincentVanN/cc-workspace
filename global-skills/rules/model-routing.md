---
description: Model routing rules. The orchestrator never writes in repos — it delegates to teammates. Can write in orchestrator/.
globs: ["workspace.md", "plans/**", "constitution.md", "templates/**"]
---

# Model Routing

## Golden rule
The orchestrator NEVER writes code in repos. It describes what teammates must do.
Writing plans, workspace.md, constitution.md in orchestrator/ is expected and normal.
If you write code for a repo (not a markdown plan), you have failed — delegate.

## Security layers (3 layers in agent frontmatter — no settings.json pollution)
1. **Agent frontmatter**: `disallowedTools` — refused at model level
2. **Agent frontmatter**: `tools` — whitelist of permitted tools (note: `allowed-tools` is for skills only)
3. **Agent hook**: `PreToolUse` in frontmatter — structured deny response

## Routing table
| Role | Model | Mechanism |
|------|-------|-----------|
| Orchestrator | **Opus 4.6** | `claude --agent team-lead` (frontmatter `model: opus`) |
| Implementation teammates | **Sonnet 4.6** | `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` |
| QA investigators | **Sonnet 4.6** | Same |
| Data extractors / explorers | **Haiku** | Task subagents with `model: haiku` — raw data only, no reasoning |
| Gatherers (cross-check, debug, retro) | **Haiku** | Task subagents — raw data extraction only |

## Gather → Reason pattern

Skills that need both data collection and analysis use a two-phase approach:

1. **Gather (Haiku)** — Spawn parallel Explore subagents (Task, model: haiku) that extract
   raw data: code snippets, type definitions, config values, log entries. They return
   structured facts. They do NOT judge, compare, or conclude.

2. **Reason (Opus)** — The skill itself (running as Opus via `context: fork`) receives
   the raw data and performs all analysis: comparison, correlation, judgment, diagnosis,
   and report writing.

This pattern applies to: `cross-service-check`, `incident-debug`, `cycle-retrospective`.
It does NOT apply to: `qa-ruthless` (QA investigators are Sonnet — they need to run tests
and reason about code quality), `plan-review` (structural checklist, Haiku is sufficient).

## Custom agent `implementer`
For Task subagents that need to write code in an isolated worktree,
use `@implementer` (frontmatter with `isolation: worktree`).
Agent Teams teammates (Teammate tool) get automatic isolation.
