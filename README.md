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

This creates an `orchestrator/` directory and installs 13 skills, 4 agents, 9 hooks, and 2 rules into `~/.claude/`.

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
claude --agent team-lead          # orchestration sessions
claude --agent e2e-validator      # E2E validation (beta)
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
- **Never overwritten**: workspace.md, constitution.md, plans/, e2e/

### Diagnostic

```bash
npx cc-workspace doctor     # from terminal
/doctor                      # from inside a Claude Code session
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
│   │       ├── session-start-context.sh
│   │       ├── validate-spawn-prompt.sh
│   │       └── ...                  <- 9 scripts (all warning-only)
│   ├── CLAUDE.md                    <- orchestrator profile
│   ├── workspace.md                 <- filled by workspace-init
│   ├── constitution.md              <- filled by workspace-init
│   ├── .sessions/                   <- session state (gitignored, created per session)
│   ├── e2e/                         <- E2E test environment (beta)
│   │   ├── e2e-config.md            <- agent memory (generated at first boot)
│   │   ├── docker-compose.e2e.yml   <- generated at first boot
│   │   ├── tests/                   <- headless API test scripts
│   │   ├── chrome/
│   │   │   ├── scenarios/           <- Chrome test flows per plan
│   │   │   ├── screenshots/         <- evidence
│   │   │   └── gifs/                <- recorded flows
│   │   └── reports/                 <- per-plan E2E reports
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

## Parallel sessions (branch isolation)

Run multiple features in parallel without branch conflicts.

### The problem

When two orchestrator sessions dispatch teammates to the same repo, branches get mixed:
teammates from session B may branch off session A's code. The result is interleaved commits
and confused agents.

### The solution

Each feature gets a **session** — a named scope that maps to a dedicated `session/{name}`
branch in each impacted repo. Branches are created from a configurable **source branch**
(e.g., `preprod`, `develop`) defined per repo in `workspace.md`.

### Setup source branches (one time)

In `workspace.md`, add the `Source Branch` column to the service map:

```markdown
| Service  | Repo        | Type     | CLAUDE.md | Source Branch | Description    |
|----------|-------------|----------|-----------|---------------|----------------|
| api      | ../api      | backend  | ✓         | preprod       | REST API       |
| frontend | ../frontend | frontend | ✓         | preprod       | Vue/Quasar SPA |
```

### How it works

1. The team-lead identifies impacted repos during planning (Phase 2)
2. After plan approval, **Phase 2.5** creates a session:
   - Writes `.sessions/{name}.json` with impacted repos only
   - Spawns a Task subagent to run `git branch session/{name} {source}` in each repo
   - Uses `git branch` (NOT `git checkout -b`) to avoid disrupting other sessions
3. Teammates receive the session branch in their spawn prompt — they do NOT create their own branches
4. PRs go from `session/{name}` → `source_branch` (never to main directly)

### Session commands

From terminal (CLI):
```bash
cc-workspace session list                  # show active sessions + branches
cc-workspace session status feature-auth   # commits per repo on session branch
cc-workspace session close feature-auth    # interactive: create PRs, delete branches, clean up
```

From inside a Claude Code session (slash commands):
```
/session                          # list active sessions
/session status feature-auth      # commits per repo
/session close feature-auth       # interactive close
```

`session close` asks for confirmation before every action (PR creation, branch deletion, JSON cleanup).

### Parallel workflow

```bash
# Terminal 1
cd orchestrator/
claude --agent team-lead
# → "Implement OAuth" → creates session/feature-auth in api/ + frontend/

# Terminal 2
cd orchestrator/
claude --agent team-lead
# → "Add billing" → creates session/feature-billing in api/ + frontend/
# Both sessions are fully isolated — different branches, no conflicts
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
| **E2E Validator** | Sonnet 4.6 | Containers + Chrome browser testing (beta). |

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
SESSION  -> create session branches in impacted repos (Phase 2.5)
SPAWN    -> Wave 1: API/data in parallel
           Wave 2: frontend with validated API contract
           Wave 3: infra/config if applicable
COLLECT  -> update the plan with results
VERIFY   -> cross-service-check + qa-ruthless
REPORT   -> final summary
```

### Security — path-aware writes

The orchestrator can write in `orchestrator/` (plans, workspace.md, constitution.md)
but never in sibling repos. A `PreToolUse` hook in the team-lead agent frontmatter
dynamically checks if the target path is inside orchestrator/ before allowing writes.

Protection layers:
1. `disallowedTools: Bash` in agent frontmatter
2. `tools` whitelist in agent frontmatter (note: `allowed-tools` is the skill equivalent)
3. `PreToolUse` path-aware hook in agent frontmatter (team-lead only — teammates write freely in their worktrees)

---

## The 13 skills

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
| **e2e-validator** | E2E validation: containers + Chrome (beta) | `claude --agent e2e-validator` |
| **session** | List, status, close parallel sessions | `/session`, `/session status X` |
| **doctor** | Full workspace diagnostic (Haiku) | `/doctor` |
| **cleanup** | Remove orphan worktrees + stale sessions | `/cleanup` |

All use `context: fork` — a skill's result is not in context when the
next one starts. The plan on disk is the source of truth.

---

## The 4 agents

| Agent | Model | Usage |
|-------|-------|-------|
| **team-lead** | Opus 4.6 | `claude --agent team-lead` — multi-service orchestration |
| **workspace-init** | Sonnet 4.6 | `claude --agent workspace-init` — diagnostic + initial config |
| **implementer** | Sonnet 4.6 | Task subagent with `isolation: worktree` — isolated implementation |
| **e2e-validator** | Sonnet 4.6 | `claude --agent e2e-validator` — E2E validation with containers + Chrome (beta) |

---

## The 9 hooks (settings.json) + 1 agent-level hook (team-lead frontmatter)

All hooks in settings.json are **non-blocking** (exit 0 + warning). No hook blocks the session.

| Hook | Event | Effect |
|------|-------|--------|
| **path-aware write guard** | `PreToolUse` Write\|Edit\|MultiEdit | Blocks writes outside orchestrator/. **Agent frontmatter only** (team-lead) — not in settings.json, so teammates write freely in worktrees. |
| **validate-spawn-prompt** | `PreToolUse` Teammate | Warning if missing context (rules, UX, tasks, session branch) |
| **session-start-context** | `SessionStart` | Injects active plans + active sessions + first session detection |
| **user-prompt-guard** | `UserPromptSubmit` | Warning if code requested in a repo |
| **subagent-start-context** | `SubagentStart` | Injects active plan + constitution |
| **permission-auto-approve** | `PermissionRequest` | Auto-approve Read/Glob/Grep |
| **track-file-modifications** | `PostToolUse` (async) | Log of modified files |
| **teammate-idle-check** | `TeammateIdle` | Warning if remaining tasks |
| **task-completed-check** | `TaskCompleted` | Warning if tests failed |
| **notify-user** | `Notification` | Desktop notification |

---

## Slash commands (in-session)

These skills can be invoked directly from a Claude Code session, replacing the CLI for common operations.

| Command | CLI equivalent | What it does |
|---------|---------------|--------------|
| `/session` | `cc-workspace session list` | List active sessions with branches and commit counts |
| `/session status X` | `cc-workspace session status X` | Detailed session view: commits, files changed |
| `/session close X` | `cc-workspace session close X` | Interactive: create PRs, delete branches, cleanup |
| `/doctor` | `cc-workspace doctor` | Full diagnostic of workspace installation |
| `/cleanup` | _(no CLI equivalent)_ | Remove orphan worktrees, stale sessions, dangling containers |

> These slash commands use `context: fork` — they don't pollute the orchestrator's context.
> The CLI commands (`npx cc-workspace ...`) remain available for terminal use outside sessions.

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
- Orphan worktrees in `/tmp/` are cleaned up automatically at session start
- Run `/cleanup` to manually purge stale worktrees, sessions, and containers
- The markdown plan on disk is the source of truth

| Emoji | Status |
|-------|--------|
| ⏳ | TODO |
| 🔄 | IN PROGRESS |
| ✅ | DONE |
| ❌ | BLOCKED/FAILED |
| ❌ ESCALATED | Failed 2+ times, wave stopped, waiting for user |

---

## Versioning and updates

The package uses semver. The installed version is tracked in `~/.claude/.orchestrator-version`.

```bash
npx cc-workspace version    # shows package and installed versions
npx cc-workspace update     # updates if newer version
npx cc-workspace doctor     # full diagnostic (or /doctor in-session)
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
    ├── e2e-validator/
    │   └── references/
    │       ├── container-strategies.md
    │       ├── test-frameworks.md
    │       └── scenario-extraction.md
    ├── session/SKILL.md               <- /session slash command
    ├── doctor/SKILL.md                <- /doctor slash command
    ├── cleanup/SKILL.md               <- /cleanup slash command
    ├── hooks/                         <- 9 scripts (warning-only)
    ├── rules/                         <- 2 rules
    └── agents/                        <- 4 agents (team-lead, implementer, workspace-init, e2e-validator)
```

---

## Idempotence

Both `init` and `update` are safe to re-run:
- **Never overwritten**: `workspace.md`, `constitution.md`, `plans/*.md`, `e2e/` (user content)
- **Always regenerated**: `settings.json`, `CLAUDE.md`, `_TEMPLATE.md`
- **Always copied**: hooks, templates
- **Always regenerated on init**: `service-profiles.md` (fresh scan)
- **Global components**: only updated if the version is newer (or `--force`)

---

## E2E Validator (beta)

A dedicated agent that validates completed plans by running services in containers
and testing scenarios — including Chrome browser-driven UI tests.

```bash
cd orchestrator/
claude --agent e2e-validator
```

### First boot — setup

On first boot (no `e2e/e2e-config.md`), the agent:
1. Reads `workspace.md` for repos and stacks
2. Scans repos for existing `docker-compose.yml` and test frameworks
3. If docker-compose exists: generates an overlay (`docker-compose.e2e.yml`)
4. If not: builds the config interactively with you
5. Writes `e2e/e2e-config.md` (its persistent memory)

### Modes

| Mode | Description |
|------|-------------|
| `validate <plan>` | Test a specific completed plan (API tests) |
| `validate <plan> --chrome` | Same + Chrome browser UI tests |
| `run-all` | Run all E2E tests (headless) |
| `run-all --chrome` | Run all E2E tests + Chrome |
| `setup` | Re-run first boot setup |

Add `--fix` to any mode to dispatch teammates for fixing failures.

### How it works

1. Creates `/tmp/` worktrees on session branches (from the plan)
2. Starts services via `docker compose up`
3. Waits for health checks
4. Runs existing test suites + generates API scenario tests from the plan
5. With `--chrome`: drives Chrome via chrome-devtools MCP (navigate, fill forms,
   click, take screenshots, record GIFs, check network requests and console)
6. Generates report with evidence (screenshots, GIFs, network traces)
7. Tears down containers and worktrees

### Chrome testing

With `--chrome`, the agent:
- Navigates the frontend in your real Chrome browser
- Plays user scenarios extracted from the plan
- Takes screenshots at each step as evidence
- Records GIFs of complete flows
- Checks the 4 mandatory UX states (loading, empty, error, success)
- Tests responsive layouts (mobile viewport)
- Verifies network requests match the API contract
- Checks console for errors

### Requirements

- **Docker** (docker compose v2)
- **Chrome** with chrome-devtools MCP server (for `--chrome` mode)
- Completed plan (all tasks ✅) with session branches

---

## Changelog v4.5.1 -> v4.6.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **Framework-agnostic UX standards** | `frontend-ux-standards.md` no longer hardcodes Quasar. Breakpoints, dialogs, and design system sections now reference the project's chosen library. Constitution overrides are documented. |
| 2 | **Rollback protocol externalized** | Rollback and failed dispatch procedures moved from team-lead agent prompt (203→~170 lines) to `references/rollback-protocol.md`. Reduces base context load. |
| 3 | **LSP fallback documented** | `qa-ruthless` and `incident-debug` now include explicit Grep+Glob fallback when LSP tool is unavailable. |
| 4 | **`cc-workspace uninstall`** | New CLI command to cleanly remove all global components from `~/.claude/`. Interactive confirmation. Local orchestrator/ preserved. |
| 5 | **workspace-init fixes** | Removed hardcoded version ("v4.0" → dynamic). Fixed skills count in diagnostic (9 → 13). |

---

## Changelog v4.4.0 -> v4.5.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **Agent prompt restructuring** | All agents now have a `CRITICAL — Non-negotiable rules` section at the top. Most important rules are front-loaded for better model adherence. Prompts reduced by ~25%. |
| 2 | **Context tiering** | Spawn templates now use 3 tiers: Tier 1 (always inject), Tier 2 (conditional), Tier 3 (never — already in agent/CLAUDE.md). Reduces implementer context bloat. |
| 3 | **Spawn template deduplication** | Git workflow instructions removed from spawn templates — the implementer agent already knows them. Only specific values (repo path, session branch) are injected. |
| 4 | **Rollback protocol** | team-lead can now `git update-ref` to reset a corrupted session branch to the last known good commit, or recreate from source branch. |
| 5 | **Failed dispatch tracking** | Plan template now includes a "Failed dispatches" section. After 2 retries, commit units are marked `❌ ESCALATED` and the wave stops for user input. |
| 6 | **Worktree crash recovery** | SessionStart hook now cleans orphan `/tmp/` worktrees left by crashed implementers. Implementer can also reuse an existing worktree from a previous failed attempt. |
| 7 | **Implementer maxTurns 50→60** | Buffer for complex commit units. Prevents context loss at boundary. |
| 8 | **3 new slash commands** | `/session` (list, status, close sessions), `/doctor` (full diagnostic), `/cleanup` (orphan worktrees + stale sessions). Replaces `npx cc-workspace` CLI for in-session use. |
| 9 | **13 skills** | Up from 10. New: session, doctor, cleanup. |

---

## Changelog v4.3.0 -> v4.4.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **E2E Validator agent (beta)** | New `e2e-validator` agent: validates completed plans by running services in containers. Supports headless API tests and Chrome browser-driven UI tests with screenshots and GIF recording. |
| 2 | **Chrome testing mode** | `--chrome` flag drives the user's Chrome browser via chrome-devtools MCP. Navigates, fills forms, clicks, takes screenshots, records GIFs, checks network and console. |
| 3 | **E2E directory structure** | `orchestrator/e2e/` created during init/update. Contains docker-compose overlay, test scripts, Chrome scenarios, screenshots, GIFs, and reports. Never overwritten by updates. |
| 4 | **Container strategies** | Reference docs for overlay and standalone docker-compose patterns per stack (PHP, Node, Python, Go, Vue, React). |
| 5 | **Scenario extraction** | Reference doc for extracting testable E2E scenarios from completed plans (API endpoints, Chrome flows, UX states). |
| 6 | **5 modes** | setup, validate, validate --chrome, run-all, run-all --chrome. Optional --fix dispatches teammates. |

---

## Changelog v4.2.0 -> v4.3.0

> Minor improvements and bug fixes.

---

## Changelog v4.1.4 -> v4.2.0

| # | Feature | Detail |
|---|---------|--------|
| 1 | **Session management** | Branch isolation for parallel features. Each session creates `session/{name}` branches in impacted repos only. `git branch` (no checkout) to avoid disrupting other sessions. |
| 2 | **Source branch per repo** | `workspace.md` service map now includes a `Source Branch` column (e.g., `preprod`, `develop`). Session branches are created from this branch. |
| 3 | **Phase 2.5 in dispatch** | New phase between Plan and Dispatch: creates session JSON + branches via Task subagent. |
| 4 | **CLI session commands** | `cc-workspace session list/status/close`. Close is interactive — asks confirmation before PRs, branch deletion, JSON cleanup. |
| 5 | **Session-aware hooks** | `session-start-context.sh` detects active sessions. `validate-spawn-prompt.sh` warns if session branch missing from spawn prompt. |
| 6 | **Spawn templates updated** | Teammates use `session/{name}` branch (already exists). No more `feature/[name]` — teammates never create their own branches. |
| 7 | **merge-prep session-aware** | Reads `.sessions/` for branch names and source branches. PRs target source branch, not hardcoded main. |

---

## Changelog v4.1.0 -> v4.1.4

| # | Fix | Detail |
|---|-----|--------|
| 1 | **Hook paths use `$CLAUDE_PROJECT_DIR`** | All hooks in settings.json resolve via `${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/`. Fixes failures when subagents run from a worktree CWD. |
| 2 | **stdout/stderr fix** | `task-completed-check.sh` and `teammate-idle-check.sh`: moved messages to stderr (stdout ignored by Claude Code for these events). |
| 3 | **Removed `WorktreeCreate` hook** | stdout was interpreted as worktree path, creating ghost directories. Removed. |
| 4 | **`block-orchestrator-writes` moved to agent frontmatter** | Was in settings.json → inherited by teammates, blocking their writes in worktrees. Now only in team-lead frontmatter. |
| 5 | **`track-file-modifications` scoped** | Skips when `CLAUDE_PROJECT_DIR` is unset (teammate worktree). No more parasitic log files in worktrees. |

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
