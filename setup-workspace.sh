#!/bin/bash
# setup-workspace.sh v4.0
#
# Creates an orchestrator/ directory inside the target workspace.
# The orchestrator is a sibling of the repos it manages.
#
# Usage:
#   cd ~/projects/my-workspace
#   bash /path/to/setup-workspace.sh [workspace-dir] ["Project Name"]
#   bash /path/to/setup-workspace.sh --force    # force update global components
#
# Result:
#   workspace-dir/
#   ├── orchestrator/          ← created by this script
#   │   ├── .claude/
#   │   │   ├── settings.json
#   │   │   └── hooks/*.sh
#   │   ├── CLAUDE.md
#   │   ├── workspace.md       ← [UNCONFIGURED], filled by team-lead
#   │   ├── constitution.md    ← template, filled by team-lead
#   │   ├── templates/
#   │   │   ├── workspace.template.md
#   │   │   └── constitution.template.md
#   │   └── plans/
#   │       ├── _TEMPLATE.md
#   │       └── service-profiles.md
#   ├── repo-a/    (.git)      ← untouched
#   ├── repo-b/    (.git)      ← untouched
#   └── ...

set -euo pipefail

# ===================================================
# Parse arguments
# ===================================================

FORCE_UPDATE=false
for arg in "$@"; do
    [[ "$arg" == "--force" || "$arg" == "--update" ]] && FORCE_UPDATE=true
done

# Remove flags from positional args
ARGS=()
for arg in "$@"; do
    [[ "$arg" == "--force" || "$arg" == "--update" ]] || ARGS+=("$arg")
done

WORKSPACE="${ARGS[0]:-.}"
PROJECT_NAME="${ARGS[1]:-Mon Projet}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GLOBAL_SKILLS_DIR="$HOME/.claude/skills"
GLOBAL_RULES_DIR="$HOME/.claude/rules"
GLOBAL_AGENTS_DIR="$HOME/.claude/agents"
GLOBAL_CONSTITUTION="$HOME/.claude/constitution.md"

# Ensure workspace directory exists
mkdir -p "$WORKSPACE"
WORKSPACE_ABS="$(cd "$WORKSPACE" && pwd)"
ORCH_DIR="$WORKSPACE_ABS/orchestrator"

echo "Setup orchestrator: $PROJECT_NAME"
echo "   Workspace: $WORKSPACE_ABS"
echo "   Orchestrator: $ORCH_DIR"
echo ""

# ===================================================
# 1. Global components — auto-install if missing
# ===================================================

GLOBALS_MISSING=false
[ ! -d "$GLOBAL_SKILLS_DIR" ] || [ ! -d "$GLOBAL_RULES_DIR" ] || [ ! -d "$GLOBAL_AGENTS_DIR" ] && GLOBALS_MISSING=true

if $GLOBALS_MISSING || $FORCE_UPDATE; then
    $FORCE_UPDATE && echo "Force update — reinstalling global components..." || echo "Global components missing — installing..."
    if [ -d "$SCRIPT_DIR/global-skills" ]; then
        mkdir -p "$GLOBAL_SKILLS_DIR" "$GLOBAL_RULES_DIR" "$GLOBAL_AGENTS_DIR"
        for skill_dir in "$SCRIPT_DIR/global-skills"/*/; do
            [ -d "$skill_dir" ] || continue
            skill_name=$(basename "$skill_dir")
            [[ "$skill_name" == "rules" || "$skill_name" == "agents" || "$skill_name" == "hooks" || "$skill_name" == "templates" ]] && continue
            cp -r "$skill_dir" "$GLOBAL_SKILLS_DIR/$skill_name"
            echo "  skill:$skill_name installed"
        done
        [ -d "$SCRIPT_DIR/global-skills/rules" ] && cp "$SCRIPT_DIR/global-skills/rules"/*.md "$GLOBAL_RULES_DIR/" 2>/dev/null && echo "  rules installed"
        [ -d "$SCRIPT_DIR/global-skills/agents" ] && cp "$SCRIPT_DIR/global-skills/agents"/*.md "$GLOBAL_AGENTS_DIR/" 2>/dev/null && echo "  agents installed"
        [ -f "$SCRIPT_DIR/global-skills/constitution.md" ] && cp "$SCRIPT_DIR/global-skills/constitution.md" "$GLOBAL_CONSTITUTION" && echo "  constitution (FR) installed"
        echo ""
    else
        echo "ERROR: Cannot find global-skills. Install them manually." >&2
        exit 1
    fi
fi

# ===================================================
# 2. Create orchestrator structure
# ===================================================

mkdir -p "$ORCH_DIR/.claude/hooks"
mkdir -p "$ORCH_DIR/plans"
mkdir -p "$ORCH_DIR/templates"
mkdir -p "$ORCH_DIR/.sessions"
echo "Orchestrator structure created"

# ===================================================
# 3. Templates
# ===================================================

if [ -d "$SCRIPT_DIR/global-skills/templates" ]; then
    cp "$SCRIPT_DIR/global-skills/templates"/*.md "$ORCH_DIR/templates/" 2>/dev/null
    echo "Templates copied"
fi

# ===================================================
# 4. workspace.md (from template, with [UNCONFIGURED])
# ===================================================

if [ ! -f "$ORCH_DIR/workspace.md" ]; then
    if [ -f "$ORCH_DIR/templates/workspace.template.md" ]; then
        cp "$ORCH_DIR/templates/workspace.template.md" "$ORCH_DIR/workspace.md"
    else
        cat > "$ORCH_DIR/workspace.md" << EOF
# Workspace: $PROJECT_NAME

## Projet
[UNCONFIGURED]
EOF
    fi
    echo "workspace.md created ([UNCONFIGURED] — team-lead will configure)"
else
    echo "workspace.md exists — not overwritten"
fi

# ===================================================
# 5. constitution.md (from template)
# ===================================================

if [ ! -f "$ORCH_DIR/constitution.md" ]; then
    if [ -f "$ORCH_DIR/templates/constitution.template.md" ]; then
        cp "$ORCH_DIR/templates/constitution.template.md" "$ORCH_DIR/constitution.md"
    else
        cat > "$ORCH_DIR/constitution.md" << EOF
# Constitution — $PROJECT_NAME

Write your engineering principles here. The workspace-init agent will help.

## Rules

1. **[Rule name].** [Description]
EOF
    fi
    echo "constitution.md created (template — team-lead will configure)"
else
    echo "constitution.md exists — not overwritten"
fi

# ===================================================
# 6. Install hook scripts
# ===================================================

HOOKS_DIR="$ORCH_DIR/.claude/hooks"
HOOKS_SRC="$SCRIPT_DIR/global-skills/hooks"

# block-orchestrator-writes.sh — ALWAYS regenerated (critical security)
cat > "$HOOKS_DIR/block-orchestrator-writes.sh" << 'HOOKEOF'
#!/usr/bin/env bash
# block-orchestrator-writes.sh v4.0
# PreToolUse hook: blocks writes to sibling repos. Allows writes within orchestrator/.
set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null) || FILE_PATH=""

if [ -z "$FILE_PATH" ]; then
    cat << 'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Cannot determine target path. Delegate to a teammate."}}
EOF
    exit 0
fi

ORCH_DIR="${CLAUDE_PROJECT_DIR:-.}"
ORCH_ABS="$(cd "$ORCH_DIR" 2>/dev/null && pwd)" || ORCH_ABS=""

if [ -d "$(dirname "$FILE_PATH")" ]; then
    TARGET_ABS="$(cd "$(dirname "$FILE_PATH")" 2>/dev/null && pwd)/$(basename "$FILE_PATH")"
else
    TARGET_ABS="$FILE_PATH"
fi

if [ -n "$ORCH_ABS" ]; then
    case "$TARGET_ABS" in
        "$ORCH_ABS"/*)
            exit 0
            ;;
    esac
fi

PARENT_DIR="$(dirname "$ORCH_ABS" 2>/dev/null)" || PARENT_DIR=""
if [ -n "$PARENT_DIR" ]; then
    for repo_dir in "$PARENT_DIR"/*/; do
        [ -d "$repo_dir/.git" ] || continue
        REPO_ABS="$(cd "$repo_dir" 2>/dev/null && pwd)"
        case "$TARGET_ABS" in
            "$REPO_ABS"/*)
                REPO_NAME=$(basename "$REPO_ABS")
                cat << EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Cannot write in repo $REPO_NAME/. Delegate to a teammate via Agent Teams."}}
EOF
                exit 0
                ;;
        esac
    done
fi

cat << 'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Write target is outside orchestrator/. Delegate to a teammate."}}
EOF
exit 0
HOOKEOF
chmod +x "$HOOKS_DIR/block-orchestrator-writes.sh"

# Copy remaining hooks from source
if [ -d "$HOOKS_SRC" ]; then
    for hook_script in "$HOOKS_SRC"/*.sh; do
        [ -f "$hook_script" ] || continue
        HOOK_BASENAME=$(basename "$hook_script")
        # Skip verify-cycle-complete if it exists in source (removed in v4.0)
        [[ "$HOOK_BASENAME" == "verify-cycle-complete.sh" ]] && continue
        cp "$hook_script" "$HOOKS_DIR/$HOOK_BASENAME"
        chmod +x "$HOOKS_DIR/$HOOK_BASENAME"
    done
    echo "Hooks installed from source"
else
    echo "WARNING: No hooks source found at $HOOKS_SRC — only block-orchestrator-writes installed" >&2
fi

# ===================================================
# 7. Scan sibling repos
# ===================================================

echo ""
echo "Scanning sibling repos in $WORKSPACE_ABS ..."

REPOS_FOUND=()
PROFILES=""
REPOS_WITHOUT_CLAUDE_MD=()

detect_project_type() {
    local dir="$1"
    local TYPE="unknown"
    [ -f "$dir/composer.json" ] && TYPE="PHP/Laravel"
    [ -f "$dir/pom.xml" ] && TYPE="Java/Spring"
    [ -f "$dir/build.gradle" ] && TYPE="Java/Gradle"
    { [ -f "$dir/requirements.txt" ] || [ -f "$dir/pyproject.toml" ]; } && TYPE="Python"
    [ -f "$dir/go.mod" ] && TYPE="Go"
    [ -f "$dir/Cargo.toml" ] && TYPE="Rust"
    if [ -f "$dir/package.json" ]; then
        grep -q "quasar" "$dir/package.json" 2>/dev/null && TYPE="Vue/Quasar"
        grep -q "nuxt" "$dir/package.json" 2>/dev/null && TYPE="Vue/Nuxt"
        grep -q "next" "$dir/package.json" 2>/dev/null && TYPE="React/Next"
        grep -q '"vue"' "$dir/package.json" 2>/dev/null && [ "$TYPE" = "unknown" ] && TYPE="Vue"
        grep -q '"react"' "$dir/package.json" 2>/dev/null && [ "$TYPE" = "unknown" ] && TYPE="React"
        [ "$TYPE" = "unknown" ] && TYPE="Node.js"
    fi
    echo "$TYPE"
}

for dir in "$WORKSPACE_ABS"/*/; do
    [ -d "$dir" ] || continue
    dir_name=$(basename "$dir")
    [ "$dir_name" = "orchestrator" ] && continue
    [ -d "$dir/.git" ] || continue

    REPOS_FOUND+=("$dir_name")
    TYPE=$(detect_project_type "$dir")
    HAS_CLAUDE_MD="no"
    [ -f "$dir/CLAUDE.md" ] && HAS_CLAUDE_MD="yes"
    [ "$HAS_CLAUDE_MD" = "no" ] && REPOS_WITHOUT_CLAUDE_MD+=("$dir_name")
    echo "  $dir_name ($TYPE) CLAUDE.md: $HAS_CLAUDE_MD"

    if [ "$HAS_CLAUDE_MD" = "yes" ]; then
        PROFILES+="## $dir_name (../$dir_name/)\n- **Type** : $TYPE\n- **CLAUDE.md** : present\n\n"
    else
        PROFILES+="## $dir_name (../$dir_name/)\n- **Type** : $TYPE\n- **CLAUDE.md** : ABSENT — /bootstrap-repo\n\n"
    fi
done

echo ""

# ===================================================
# 8. Generate service-profiles.md
# ===================================================

cat > "$ORCH_DIR/plans/service-profiles.md" << EOF
# Service Profiles — $PROJECT_NAME
> Generated: $(date +%Y-%m-%d)
> Regenerate with \`/refresh-profiles\`

$(echo -e "$PROFILES")
EOF
echo "service-profiles.md generated"

# ===================================================
# 9. CLAUDE.md
# ===================================================

if [ ! -f "$ORCH_DIR/CLAUDE.md" ]; then
    cat > "$ORCH_DIR/CLAUDE.md" << 'CLAUDEEOF'
# Orchestrator v4.0

You are the tech lead. You never code in repos — you can write in orchestrator/.
You clarify, plan, delegate, track.

## Security
- `disallowedTools: Bash` — no direct shell
- `tools` : Read, Write, Edit, Glob, Grep, Task(implementer, Explore), Teammate, SendMessage
- Hook `PreToolUse` path-aware: allows orchestrator/, blocks sibling repos

> settings.json contains env vars + hooks registration.

## Launch
```
cd orchestrator/
claude --agent workspace-init   # first time: diagnostic + config
claude --agent team-lead         # work sessions
```

## Initialization (workspace-init)
The `workspace-init` agent checks the structure, scans sibling repos (type, CLAUDE.md,
.claude/, tests), and interactively configures workspace.md and constitution.md if [UNCONFIGURED].
Run once. Idempotent — can be re-run to re-diagnose.

## 4 session modes
| Mode | Description |
|------|-------------|
| **A — Full** | Clarify → Plan → Validate → Dispatch in waves → QA |
| **B — Quick plan** | Specs → Plan → Dispatch |
| **C — Go direct** | Immediate dispatch |
| **D — Single-service** | 1 repo, no waves |

## Config
- Project context: `./workspace.md`
- Project constitution: `./constitution.md`
- Templates: `./templates/workspace.template.md`, `./templates/constitution.template.md`
- Service profiles: `./plans/service-profiles.md`
- Active plans: `./plans/*.md`

## Skills (9)
- **dispatch-feature**: 4 modes, clarify → plan → waves → collect → verify (context: fork)
- **qa-ruthless**: adversarial QA, min 3 findings per service (context: fork)
- **cross-service-check**: inter-repo consistency (context: fork)
- **incident-debug**: multi-layer diagnostic (context: fork)
- **plan-review**: plan sanity check (model: haiku, context: fork)
- **merge-prep**: pre-merge, conflicts, PR summaries (context: fork)
- **cycle-retrospective**: post-cycle learning (model: haiku, context: fork)
- **refresh-profiles**: re-reads repo CLAUDE.md files (model: haiku, context: fork)
- **bootstrap-repo**: generates a CLAUDE.md for a repo (model: haiku, context: fork)

## Rules
1. No code in repos — delegate to teammates
2. Can write in orchestrator/ (plans, workspace.md, constitution.md)
3. Clarify ambiguities BEFORE planning (except mode C)
4. All plans in markdown in \`./plans/\`
5. Dispatch via Agent Teams (Teammate tool) in waves
6. Full constitution (all rules from constitution.md) in every spawn prompt
7. UX standards injected for frontend teammates
8. Each teammate detects dead code
9. Escalate arch decisions not covered by the plan
10. Ruthless QA — UX violations = blocking
11. Compact after each cycle
12. Hooks are warning-only — never blocking
13. Retrospective cycle after each completed feature
CLAUDEEOF
    echo "CLAUDE.md v4.0 created"
else
    echo "CLAUDE.md exists — not overwritten"
fi

# ===================================================
# 10. Plan template
# ===================================================

if [ ! -f "$ORCH_DIR/plans/_TEMPLATE.md" ]; then
    cat > "$ORCH_DIR/plans/_TEMPLATE.md" << 'TMPL'
# Plan: [NOM]
> Cree le : [DATE]
> Statut : En cours

## Contexte
[Pourquoi cette feature]

## Clarifications
[Reponses clarify]

## Services impactes
| Service | Impacte | Branche | Teammate | Statut |
|---------|---------|---------|----------|--------|
| | oui/non | | | ⏳ |

## Waves
- Wave 1: [producteurs]
- Wave 2: [consommateurs]
- Wave 3: [infra]

## Contrat API
[Shapes exactes]

## Taches

### [service]
- ⏳ [tache]

## QA
- ⏳ Cross-service check
- ⏳ QA ruthless
- ⏳ Merge prep

## Session log
- [DATE HH:MM] : Plan cree
TMPL
    echo "Plan template created"
fi

# ===================================================
# 11. settings.json
# ===================================================

HOOKS_PATH=".claude/hooks"
cat > "$ORCH_DIR/.claude/settings.json" << SETTINGSEOF
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  },
  "hooks": {
    "PreToolUse": [
      { "matcher": "Write|Edit|MultiEdit", "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/block-orchestrator-writes.sh", "timeout": 5 }] },
      { "matcher": "Teammate", "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/validate-spawn-prompt.sh", "timeout": 5 }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/session-start-context.sh", "timeout": 10 }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/user-prompt-guard.sh", "timeout": 3 }] }
    ],
    "SubagentStart": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/subagent-start-context.sh", "timeout": 5 }] }
    ],
    "PermissionRequest": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/permission-auto-approve.sh", "timeout": 3 }] }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit|MultiEdit", "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/track-file-modifications.sh", "timeout": 3 }] }
    ],
    "TeammateIdle": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/teammate-idle-check.sh", "timeout": 5 }] }
    ],
    "TaskCompleted": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/task-completed-check.sh", "timeout": 3 }] }
    ],
    "WorktreeCreate": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/worktree-create-context.sh", "timeout": 3 }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "bash $HOOKS_PATH/notify-user.sh", "timeout": 5 }] }
    ]
  }
}
SETTINGSEOF
echo "settings.json created (env + hooks)"

# ===================================================
# 12. .gitignore
# ===================================================

if [ ! -f "$ORCH_DIR/.gitignore" ]; then
    cat > "$ORCH_DIR/.gitignore" << 'GIEOF'
.claude/bash-commands.log
.claude/worktrees/
.claude/modified-files.log
.sessions/
plans/*.md
!plans/_TEMPLATE.md
!plans/service-profiles.md
GIEOF
    echo ".gitignore created"
fi

# ===================================================
# Summary
# ===================================================

echo ""
echo "==================================================="
echo "Orchestrator '$PROJECT_NAME' ready! (v4.0)"
echo "==================================================="
echo "  Directory: $ORCH_DIR"
echo "  Repos found: ${#REPOS_FOUND[@]}"
echo "  Hooks: 11 scripts (all warning-only)"
echo ""
echo "  Next steps:"
echo "    1. cd orchestrator/"
echo "    2. claude --agent workspace-init     (first time — diagnostic & config)"
echo "    3. claude --agent team-lead           (orchestration)"
echo ""
if [ ${#REPOS_WITHOUT_CLAUDE_MD[@]} -gt 0 ]; then
    echo "  Repos without CLAUDE.md: ${REPOS_WITHOUT_CLAUDE_MD[*]}"
    echo "     -> /bootstrap-repo for each"
    echo ""
fi
echo "Ready! Launch: cd orchestrator && claude --agent workspace-init"
