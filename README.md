# cc-workspace

**Claude Code Multi-Workspace Orchestrator** — turn Claude Code into a team of AI developers that work in parallel across your repos.

Instead of Claude Code trying to do everything in one session and losing context, `cc-workspace` sets up an orchestrator (Opus) that clarifies requirements, writes a plan, then delegates to teammates (Sonnet) who implement in parallel — each in their own repo, their own worktree, their own context.

> Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v2.1.47+ with Agent Teams.
> Works with Opus 4.6, Sonnet 4.6, Haiku 4.5 (February 2026).

---

## Quick start

### Prerequisites

- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** v2.1.47+
- **Node.js** 18+
- **jq** (`brew install jq` on macOS, `apt install jq` on Linux)

### Setup a workspace

```bash
# Navigate to the parent directory containing your repos
cd ~/projects/my-workspace

# Initialize the orchestrator (no install needed)
npx cc-workspace init . "My Project"
```

This creates an `orchestrator/` directory and installs 9 skills, 3 agents, 10 hooks, and 3 rules into `~/.claude/`.

### Configure (one time)

```bash
cd orchestrator/
claude --agent workspace-init
# type "go" to start the interactive diagnostic
```

The init agent will:
1. Scan sibling repos and detect their tech stacks
2. Offer to generate missing `CLAUDE.md` files for each repo
3. Walk you through `workspace.md` configuration (section by section)
4. Walk you through `constitution.md` (your engineering principles)

### Start working

```bash
cd orchestrator/
claude --agent team-lead
```

The team-lead offers 4 modes:

| Mode | When to use |
|------|-------------|
| **A -- Full** | Complex feature, multi-service, needs clarification |
| **B -- Quick plan** | Clear specs, no questions needed |
| **C -- Go direct** | Hotfix, quick fix, obvious specs |
| **D -- Single-service** | Bug or isolated feature in a single repo |

### Update

```bash
npx cc-workspace update
```

Updates all components if the package version is newer:
- **Global**: skills, rules, agents in `~/.claude/`
- **Local** (if `orchestrator/` found): hooks, settings.json, CLAUDE.md, templates, _TEMPLATE.md
- **Never overwritten**: workspace.md, constitution.md, plans/

### Diagnostic

```bash
npx cc-workspace doctor
```

Checks: installed version, skills, rules, agents, hooks, jq, orchestrator/ structure.

---

## Resulting structure

```
my-workspace/
├── orchestrator/                    <- you cd here
│   ├── .claude/
│   │   ├── settings.json           <- env vars + hooks
│   │   └── hooks/
│   │       ├── block-orchestrator-writes.sh
│   │       ├── session-start-context.sh
│   │       ├── validate-spawn-prompt.sh
│   │       └── ...                  <- 11 scripts
│   ├── CLAUDE.md                    <- orchestrator profile
│   ├── workspace.md                 <- filled by workspace-init
│   ├── constitution.md              <- filled by workspace-init
│   ├── templates/
│   │   ├── workspace.template.md
│   │   ├── constitution.template.md
│   │   └── claude-md.template.md    <- template for repo CLAUDE.md files
│   └── plans/
│       ├── _TEMPLATE.md
│       └── service-profiles.md
│
├── repo-a/          (.git)          <- teammate worktree
├── repo-b/          (.git)          <- teammate worktree
└── repo-c/          (.git)          <- teammate worktree
```

---

## How it works

### The problem

You have a project with 3-5 repos (API, frontend, infra, etc.). When you
ask Claude Code for a feature, it tries to do everything itself:
it loses context, can't work in multiple repos at once, and guesses
instead of asking.

### The solution

The orchestrator (Opus) never touches repo code. It clarifies the need,
writes a plan in markdown, then sends teammates (Sonnet) to work in
parallel in each repo via Agent Teams.

### Who does what

| Role | Model | What it does |
|------|-------|-------------|
| **Orchestrator** | Opus 4.6 | Clarifies, plans, delegates, verifies. Writes in orchestrator/ only. |
| **Init** | Sonnet 4.6 | Diagnostic + interactive workspace configuration. Run once. |
| **Teammates** | Sonnet 4.6 | Implement in an isolated worktree, test, commit. |
| **Explorers** | Haiku | Read-only. Scan, verify consistency. |
| **QA** | Sonnet 4.6 | Hostile mode. Min 3 problems found per service. |

### The 4 session modes

| Mode | When to use |
|------|-------------|
| **A -- Full** | Complex feature, multi-service, needs clarification |
| **B -- Quick plan** | Clear specs, no questions |
| **C -- Go direct** | Hotfix, quick fix, obvious specs |
| **D -- Single-service** | Bug or isolated feature in a single repo |

### The dispatch-feature workflow (Mode A)

```
CLARIFY  -> ask max 5 questions if ambiguity
PLAN     -> write the plan in ./plans/, wait for approval
SPAWN    -> Wave 1: API/data in parallel
           Wave 2: frontend with validated API contract
           Wave 3: infra/config if applicable
COLLECT  -> update the plan with results
VERIFY   -> cross-service-check + qa-ruthless
REPORT   -> final summary
```

### Security — path-aware writes

The orchestrator can write in `orchestrator/` (plans, workspace.md, constitution.md)
but never in sibling repos. The `block-orchestrator-writes.sh` hook dynamically
detects if the target path is in a repo (presence of `.git/`).

Protection layers:
1. `disallowedTools: Bash` in agent frontmatter
2. `tools` whitelist in agent frontmatter (note: `allowed-tools` is the skill equivalent)
3. `PreToolUse` path-aware hook in agent frontmatter
4. `block-orchestrator-writes.sh` hook in .claude/hooks/

---

## The 9 skills

| Skill | Role | Trigger |
|-------|------|---------|
| **dispatch-feature** | 4 modes: Clarify -> Plan -> Delegate -> Track | "Implement X", "new feature" |
| **qa-ruthless** | Hostile QA + UX audit | "QA", "review", "test" |
| **cross-service-check** | Inter-repo consistency | "cross-service", "pre-merge" |
| **incident-debug** | Multi-layer diagnostic | "Bug", "500", "not working" |
| **plan-review** | Plan sanity check (Haiku) | "Review plan" |
| **merge-prep** | Conflicts, PRs, merge order | "Merge", "PR" |
| **cycle-retrospective** | Post-cycle learning (Haiku) | "Retro", "retrospective" |
| **refresh-profiles** | Re-scan repo CLAUDE.md files (Haiku) | "Refresh profiles" |
| **bootstrap-repo** | Generate a CLAUDE.md (Haiku) | "Bootstrap", "init CLAUDE.md" |

All use `context: fork` — a skill's result is not in context when the
next one starts. The plan on disk is the source of truth.

---

## The 3 agents

| Agent | Model | Usage |
|-------|-------|-------|
| **team-lead** | Opus 4.6 | `claude --agent team-lead` — multi-service orchestration |
| **workspace-init** | Sonnet 4.6 | `claude --agent workspace-init` — diagnostic + initial config |
| **implementer** | Sonnet 4.6 | Task subagent with `isolation: worktree` — isolated implementation |

---

## The 10 hooks

All hooks are **non-blocking** (exit 0 + warning). No hook blocks the session.

| Hook | Event | Effect |
|------|-------|--------|
| **block-orchestrator-writes** | `PreToolUse` Write\|Edit\|MultiEdit | Blocks writes in repos, allows orchestrator/ |
| **validate-spawn-prompt** | `PreToolUse` Teammate | Warning if missing context (rules, UX, tasks) |
| **session-start-context** | `SessionStart` | Injects active plans + first session detection |
| **user-prompt-guard** | `UserPromptSubmit` | Warning if code requested in a repo |
| **subagent-start-context** | `SubagentStart` | Injects active plan + constitution |
| **permission-auto-approve** | `PermissionRequest` | Auto-approve Read/Glob/Grep |
| **track-file-modifications** | `PostToolUse` (async) | Log of modified files |
| **teammate-idle-check** | `TeammateIdle` | Warning if remaining tasks |
| **task-completed-check** | `TaskCompleted` | Warning if tests failed |
| **notify-user** | `Notification` | Desktop notification |

---

## The 3 templates

| Template | Usage |
|----------|-------|
| `workspace.template.md` | Structure for workspace.md (project, service map, relationships, rules, onboarding) |
| `constitution.template.md` | Structure for constitution.md (your engineering principles) |
| `claude-md.template.md` | Standardized structure for repo CLAUDE.md files (stack, arch, rules, tests, anti-patterns) |

---

## Auto-discovery of repos

The orchestrator automatically scans `../` to find sibling repos:
- Any directory with `.git/` is an available repo
- The orchestrator excludes itself
- New repos are flagged at startup
- `/refresh-profiles` re-reads all repo CLAUDE.md files

---

## Portability

The `orchestrator/` directory is portable:
1. Copy it into any workspace
2. `cd orchestrator && claude --agent workspace-init`
3. If `workspace.md` contains `[UNCONFIGURED]`, the config flow restarts
4. Sibling repos are re-discovered automatically

---

## The constitution

`constitution.md` in orchestrator/. You define **all** your engineering
principles here — security, UX, code quality, process, project-specific rules.
The `workspace-init` agent helps you write it interactively.

There is no global constitution imposed by the package. Each workspace
defines its own rules. The orchestrator includes the full constitution
in every teammate spawn prompt (teammates don't receive it automatically).

---

## Recovery after crash

- `claude --resume` resumes the session with the team-lead agent
- The SessionStart hook automatically injects active plans
- The markdown plan on disk is the source of truth

| Emoji | Status |
|-------|--------|
| ⏳ | TODO |
| 🔄 | IN PROGRESS |
| ✅ | DONE |
| ❌ | BLOCKED/FAILED |

---

## Versioning and updates

The package uses semver. The installed version is tracked in `~/.claude/.orchestrator-version`.

```bash
npx cc-workspace version    # shows package and installed versions
npx cc-workspace update     # updates if newer version
npx cc-workspace doctor     # full diagnostic
```

On each `init` or `update`, the CLI compares versions:
- **Newer version** → overrides skills, rules, agents, hooks
- **Same version** → skip (unless `--force`)
- **Workspace files** (workspace.md, constitution.md, plans/) → never overwritten

---

## Package contents

```
cc-workspace/
├── package.json                       <- npm package, semver version
├── bin/cli.js                         <- CLI (npx cc-workspace)
├── README.md
├── LICENSE
│
└── global-skills/                     <- components installed in ~/.claude/
    ├── templates/
    │   ├── workspace.template.md
    │   ├── constitution.template.md
    │   └── claude-md.template.md
    ├── dispatch-feature/
    │   ├── SKILL.md
    │   └── references/
    │       ├── frontend-ux-standards.md
    │       ├── spawn-templates.md
    │       └── anti-patterns.md
    ├── qa-ruthless/SKILL.md
    ├── cross-service-check/SKILL.md
    ├── incident-debug/SKILL.md
    ├── plan-review/SKILL.md
    ├── merge-prep/SKILL.md
    ├── cycle-retrospective/SKILL.md
    ├── refresh-profiles/SKILL.md
    ├── bootstrap-repo/SKILL.md
    ├── hooks/                         <- 11 scripts (warning-only)
    ├── rules/                         <- 3 rules
    └── agents/                        <- 3 agents (team-lead, implementer, workspace-init)
```

---

## Idempotence

Both `init` and `update` are safe to re-run:
- **Never overwritten**: `workspace.md`, `constitution.md`, `plans/*.md` (user content)
- **Always regenerated**: `settings.json`, `block-orchestrator-writes.sh` (security), `CLAUDE.md`, `_TEMPLATE.md`
- **Always copied**: hooks, templates
- **Always regenerated on init**: `service-profiles.md` (fresh scan)
- **Global components**: only updated if the version is newer (or `--force`)

---

## Changelog v4.1.0 -> v4.1.3

| # | Fix | Detail |
|---|-----|--------|
| 1 | **Hook paths use `$CLAUDE_PROJECT_DIR`** | All 10 hooks in settings.json now resolve via `${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/` instead of relative `.claude/hooks/`. Fixes hook failures when subagents run from a different CWD (worktree in sibling repo). |
| 2 | **stdout/stderr fix** | `task-completed-check.sh` and `teammate-idle-check.sh`: stdout ignored by Claude Code for these events — moved to stderr. |
| 3 | **Removed `WorktreeCreate` hook** | `worktree-create-context.sh` caused worktree creation to fail — stdout was interpreted as the worktree path, creating ghost directories. Removed entirely (10 hooks instead of 11). |

---

## Changelog v4.0.5 -> v4.1.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **Atomic commits** | Plan template splits tasks into commit-sized units (~300 lines max). Teammates commit as they go, not a single giant commit at the end. |
| 2 | **Progress tracker** | Plan includes a progress tracker table: commits planned vs done per service, visible at a glance. |
| 3 | **Commit strategy in spawn templates** | All teammate templates (backend, frontend, infra) include a mandatory commit strategy section with layer-by-layer split guidelines. |
| 4 | **Commit granularity enforcement** | Team-lead checks commit count vs plan, flags giant commits (>400 lines), requires split before accepting a wave. |
| 5 | **Teammate commit reporting** | Teammates report commits made (hash + message) alongside files and tests. |

---

## Changelog v4.0 -> v4.0.5

| # | Fix | Detail |
|---|-----|--------|
| 1 | **Agent frontmatter fix** | `allowed-tools` → `tools` on all 3 agents. `allowed-tools` is the skill field — agents use `tools`. Without this fix, tool restrictions were silently ignored. |
| 2 | **Removed `effort` field** | `effort: high/medium/low` doesn't exist in Claude Code spec. Removed from all agents. |
| 3 | **Skill `agent` field** | Added `agent: Explore` or `agent: general-purpose` to 6 skills for proper subagent routing. |
| 4 | **`Task(type)` restrictions** | team-lead restricted to `Task(implementer, Explore)`, workspace-init to `Task(Explore)`. |
| 5 | **`update` fixes local files** | `npx cc-workspace update` now also updates local orchestrator/ files (hooks, settings.json, CLAUDE.md, templates, _TEMPLATE.md). Previously only updated globals. |
| 6 | **Failure handling** | Added failure handling section to spawn-templates: max 2 re-dispatches, escalation criteria. |

---

## Changelog v3.5.0 -> v4.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **NPX package** | `npx cc-workspace init/update/doctor`. Semver versioning. |
| 2 | **Portable orchestrator** | Always in an `orchestrator/` subdirectory. No more child/sibling mode. |
| 3 | **workspace-init agent** | Diagnostic + interactive config. Replaces [UNCONFIGURED] detection in team-lead. |
| 4 | **CLAUDE.md template** | `claude-md.template.md` — standardized structure for repos. |
| 5 | **Auto repo discovery** | Scans `../` for `.git/`. No hardcoded list. |
| 6 | **4 session modes** | Full, Quick plan, Go direct, Single-service. |
| 7 | **Warning-only hooks** | No more blocking hooks (exit 2 -> exit 0). |
| 8 | **verify-cycle-complete removed** | No more exit blocking. |
| 9 | **Orchestrator can write** | In orchestrator/ only. Dynamic path-aware hook. |
| 10 | **Per-workspace constitution** | No global constitution — each workspace defines its own rules. |
| 11 | **30-line limit removed** | The orchestrator adapts verbosity to context. |
| 12 | **Structured templates** | workspace.template.md + constitution.template.md + claude-md.template.md. |

---

<details>
<summary>Changelog v3.4.2 -> v3.5.0</summary>

| # | Fix/Feature | Detail |
|---|-------------|--------|
| 1 | Dual-mode setup | `--mode child\|sibling`. Auto-detection. |
| 2 | Fix frontmatter `invocation:` | Replaced by `disable-model-invocation`. |
| 3 | `argument-hint` on all skills | Improved autocompletion. |
| 4 | Hook `SubagentStart` | Injects active plan + constitution. |
| 5 | Hook `SubagentStop` (Haiku prompt) | Evaluates completeness. |
| 6 | Hook `PermissionRequest` | Auto-approve Read/Glob/Grep. |
| 7 | Hook `PostToolUse` async | Modified files tracking. |
| 8 | `hookSpecificOutput` JSON | Pattern migration. |
| 9 | `$CLAUDE_PROJECT_DIR` | Replaces `jq .cwd`. |
| 10 | `CLAUDE_ENV_FILE` in SessionStart | Exports active plan. |
| 11 | 14 hooks / 12 events | +4 hooks vs v3.4.2. |

</details>
