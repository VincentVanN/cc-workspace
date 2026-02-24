#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Package info ───────────────────────────────────────────
const PKG = require("../package.json");
const PACKAGE_DIR = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PACKAGE_DIR, "global-skills");

// ─── Claude global dirs ─────────────────────────────────────
const HOME = process.env.HOME || process.env.USERPROFILE;
const CLAUDE_DIR = path.join(HOME, ".claude");
const VERSION_FILE = path.join(CLAUDE_DIR, ".orchestrator-version");
const GLOBAL_SKILLS = path.join(CLAUDE_DIR, "skills");
const GLOBAL_RULES = path.join(CLAUDE_DIR, "rules");
const GLOBAL_AGENTS = path.join(CLAUDE_DIR, "agents");

// ─── ANSI Colors (zero deps) ────────────────────────────────
const isColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset:   isColor ? "\x1b[0m"  : "",
  bold:    isColor ? "\x1b[1m"  : "",
  dim:     isColor ? "\x1b[2m"  : "",
  green:   isColor ? "\x1b[32m" : "",
  yellow:  isColor ? "\x1b[33m" : "",
  red:     isColor ? "\x1b[31m" : "",
  cyan:    isColor ? "\x1b[36m" : "",
  blue:    isColor ? "\x1b[34m" : "",
  magenta: isColor ? "\x1b[35m" : "",
  gray:    isColor ? "\x1b[90m" : "",
  white:   isColor ? "\x1b[37m" : "",
  bgGreen: isColor ? "\x1b[42m\x1b[30m" : "",
  bgRed:   isColor ? "\x1b[41m\x1b[37m" : "",
};

// ─── Banner ─────────────────────────────────────────────────
const BANNER = `
${c.cyan}${c.bold}   ██████╗ ██████╗   ██╗    ██╗███████╗${c.reset}
${c.cyan}  ██╔════╝██╔════╝   ██║    ██║██╔════╝${c.reset}
${c.cyan}  ██║     ██║        ██║ █╗ ██║███████╗${c.reset}
${c.cyan}  ██║     ██║        ██║███╗██║╚════██║${c.reset}
${c.cyan}  ╚██████╗╚██████╗   ╚███╔███╔╝███████║${c.reset}
${c.cyan}   ╚═════╝ ╚═════╝    ╚══╝╚══╝ ╚══════╝${c.reset}
${c.dim}   Claude Code Workspace Orchestrator${c.reset} ${c.bold}v${PKG.version}${c.reset}
`;

const BANNER_SMALL = `${c.cyan}${c.bold}cc-workspace${c.reset} ${c.dim}v${PKG.version}${c.reset}`;

// ─── Output helpers ─────────────────────────────────────────
function log(msg = "") { console.log(msg); }
function ok(msg)       { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function warn(msg)     { console.log(`  ${c.yellow}⚠${c.reset} ${c.yellow}${msg}${c.reset}`); }
function fail(msg)     { console.error(`  ${c.red}✗${c.reset} ${c.red}${msg}${c.reset}`); }
function info(msg)     { console.log(`  ${c.blue}▸${c.reset} ${msg}`); }
function step(msg)     { console.log(`\n${c.bold}${c.white}  ${msg}${c.reset}`); }
function hr()          { console.log(`${c.dim}  ${"─".repeat(50)}${c.reset}`); }

// ─── FS helpers ─────────────────────────────────────────────
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

function copyFile(src, dest) { fs.copyFileSync(src, dest); }

function copyDir(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(srcPath, destPath) : copyFile(srcPath, destPath);
  }
}

// ─── Version helpers ────────────────────────────────────────
function readVersion() {
  try { return fs.readFileSync(VERSION_FILE, "utf8").trim(); }
  catch { return null; }
}

function writeVersion(v) {
  mkdirp(CLAUDE_DIR);
  fs.writeFileSync(VERSION_FILE, v + "\n");
}

function semverCompare(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function needsUpdate(force) {
  if (force) return true;
  const installed = readVersion();
  if (!installed) return true;
  return semverCompare(PKG.version, installed) > 0;
}

// ─── Detect project type ────────────────────────────────────
function detectProjectType(dir) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  const pkgHas = (kw) => {
    try { return fs.readFileSync(path.join(dir, "package.json"), "utf8").includes(kw); }
    catch { return false; }
  };
  if (has("composer.json")) return "PHP/Laravel";
  if (has("pom.xml")) return "Java/Spring";
  if (has("build.gradle")) return "Java/Gradle";
  if (has("requirements.txt") || has("pyproject.toml")) return "Python";
  if (has("go.mod")) return "Go";
  if (has("Cargo.toml")) return "Rust";
  if (has("package.json")) {
    if (pkgHas("quasar")) return "Vue/Quasar";
    if (pkgHas("nuxt")) return "Vue/Nuxt";
    if (pkgHas("next")) return "React/Next";
    if (pkgHas('"vue"')) return "Vue";
    if (pkgHas('"react"')) return "React";
    return "Node.js";
  }
  return "unknown";
}

// ─── Type badge ─────────────────────────────────────────────
function typeBadge(type) {
  const badges = {
    "PHP/Laravel": `${c.magenta}PHP/Laravel${c.reset}`,
    "Java/Spring": `${c.red}Java/Spring${c.reset}`,
    "Java/Gradle": `${c.red}Java/Gradle${c.reset}`,
    "Python":      `${c.yellow}Python${c.reset}`,
    "Go":          `${c.cyan}Go${c.reset}`,
    "Rust":        `${c.red}Rust${c.reset}`,
    "Vue/Quasar":  `${c.green}Vue/Quasar${c.reset}`,
    "Vue/Nuxt":    `${c.green}Vue/Nuxt${c.reset}`,
    "Vue":         `${c.green}Vue${c.reset}`,
    "React/Next":  `${c.blue}React/Next${c.reset}`,
    "React":       `${c.blue}React${c.reset}`,
    "Node.js":     `${c.green}Node.js${c.reset}`,
  };
  return badges[type] || `${c.dim}${type}${c.reset}`;
}

// ─── Install global components ──────────────────────────────
function installGlobals(force) {
  const installed = readVersion();
  const shouldUpdate = needsUpdate(force);

  if (!shouldUpdate) {
    ok(`Global components up to date ${c.dim}(v${installed})${c.reset}`);
    return false;
  }

  step(installed
    ? `Updating globals: ${c.dim}v${installed}${c.reset} → ${c.green}v${PKG.version}${c.reset}`
    : `Installing global components`
  );

  mkdirp(GLOBAL_SKILLS);
  mkdirp(GLOBAL_RULES);
  mkdirp(GLOBAL_AGENTS);

  // Skills
  const skipDirs = new Set(["rules", "agents", "hooks", "templates"]);
  let skillCount = 0;
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || skipDirs.has(entry.name)) continue;
    copyDir(path.join(SKILLS_DIR, entry.name), path.join(GLOBAL_SKILLS, entry.name));
    skillCount++;
  }
  ok(`${skillCount} skills`);

  // Rules
  const rulesDir = path.join(SKILLS_DIR, "rules");
  if (fs.existsSync(rulesDir)) {
    let n = 0;
    for (const f of fs.readdirSync(rulesDir)) {
      if (f.endsWith(".md")) { copyFile(path.join(rulesDir, f), path.join(GLOBAL_RULES, f)); n++; }
    }
    ok(`${n} rules`);
  }

  // Agents
  const agentsDir = path.join(SKILLS_DIR, "agents");
  if (fs.existsSync(agentsDir)) {
    let n = 0;
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.endsWith(".md")) { copyFile(path.join(agentsDir, f), path.join(GLOBAL_AGENTS, f)); n++; }
    }
    ok(`${n} agents`);
  }

  writeVersion(PKG.version);
  return true;
}

// ─── Generate settings.json with hooks ──────────────────────
// Claude Code hook format: { matcher: { tools: [...] }, hooks: [{ type: "command", command: "...", timeout: N }] }
// For hooks without tool matcher: { hooks: [{ type: "command", command: "...", timeout: N }] }
function generateSettings(orchDir) {
  const hp = ".claude/hooks";

  function hook(command, timeout) {
    return { type: "command", command: `bash ${hp}/${command}`, timeout };
  }

  function withMatcher(matcher, command, timeout) {
    return { matcher, hooks: [hook(command, timeout)] };
  }

  function withoutMatcher(command, timeout) {
    return { hooks: [hook(command, timeout)] };
  }

  const settings = {
    env: {
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
      CLAUDE_CODE_SUBAGENT_MODEL: "sonnet"
    },
    hooks: {
      PreToolUse: [
        withMatcher("Write|Edit|MultiEdit", "block-orchestrator-writes.sh", 5),
        withMatcher("Teammate", "validate-spawn-prompt.sh", 5)
      ],
      SessionStart: [
        withoutMatcher("session-start-context.sh", 10)
      ],
      UserPromptSubmit: [
        withoutMatcher("user-prompt-guard.sh", 3)
      ],
      SubagentStart: [
        withoutMatcher("subagent-start-context.sh", 5)
      ],
      PermissionRequest: [
        withoutMatcher("permission-auto-approve.sh", 3)
      ],
      PostToolUse: [
        withMatcher("Write|Edit|MultiEdit", "track-file-modifications.sh", 3)
      ],
      TeammateIdle: [
        withoutMatcher("teammate-idle-check.sh", 5)
      ],
      TaskCompleted: [
        withoutMatcher("task-completed-check.sh", 3)
      ],
      WorktreeCreate: [
        withoutMatcher("worktree-create-context.sh", 3)
      ],
      Notification: [
        withoutMatcher("notify-user.sh", 5)
      ]
    }
  };
  fs.writeFileSync(path.join(orchDir, ".claude", "settings.json"), JSON.stringify(settings, null, 2) + "\n");
}

// ─── Block hook (inline, always regenerated) ────────────────
function generateBlockHook(hooksDir) {
  const blockHook = `#!/usr/bin/env bash
# block-orchestrator-writes.sh v${PKG.version}
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

ORCH_DIR="\${CLAUDE_PROJECT_DIR:-.}"
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
`;
  fs.writeFileSync(path.join(hooksDir, "block-orchestrator-writes.sh"), blockHook, { mode: 0o755 });
}

// ─── CLAUDE.md content ──────────────────────────────────────
function claudeMdContent() {
  return `# Orchestrator v${PKG.version}

You are the tech lead. You never code in repos — you can write in orchestrator/.
You clarify, plan, delegate, track.

## Security
- \`disallowedTools: Bash\` — no direct shell
- \`tools\` : Read, Write, Edit, Glob, Grep, Task(implementer, Explore), Teammate, SendMessage
- Hook \`PreToolUse\` path-aware: allows orchestrator/, blocks sibling repos

> settings.json contains env vars + hooks registration.

## Launch
\`\`\`
cd orchestrator/
claude --agent workspace-init   # first time: diagnostic + config
claude --agent team-lead         # work sessions
\`\`\`

## Initialization (workspace-init)
The \`workspace-init\` agent checks the structure, scans sibling repos (type, CLAUDE.md,
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
- Project context: \`./workspace.md\`
- Project constitution: \`./constitution.md\`
- Templates: \`./templates/\`
- Service profiles: \`./plans/service-profiles.md\`
- Active plans: \`./plans/*.md\`

## Skills (9)
- **dispatch-feature**: 4 modes, clarify → plan → waves → collect → verify
- **qa-ruthless**: adversarial QA, min 3 findings per service
- **cross-service-check**: inter-repo consistency
- **incident-debug**: multi-layer diagnostic
- **plan-review**: plan sanity check (haiku)
- **merge-prep**: pre-merge, conflicts, PR summaries
- **cycle-retrospective**: post-cycle learning (haiku)
- **refresh-profiles**: re-reads repo CLAUDE.md files (haiku)
- **bootstrap-repo**: generates a CLAUDE.md for a repo (haiku)

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
`;
}

// ─── Plan template content ──────────────────────────────────
function planTemplateContent() {
  return `# Plan: [NAME]
> Created: [DATE]
> Status: In progress

## Context
[Why this feature]

## Clarifications
[Clarify answers]

## Impacted services
| Service | Impacted | Branch | Teammate | Status |
|---------|----------|--------|----------|--------|
| | yes/no | feature/[name] | | ⏳ |

## Waves
- Wave 1: [producers]
- Wave 2: [consumers]
- Wave 3: [infra]

## API contract
[Exact request/response shapes for each endpoint]

## Tasks

### [service]

#### Commit 1: [data layer — models, migrations, DTOs]
- ⏳ [task]
- ⏳ [task]
> ~N files, ~N lines

#### Commit 2: [business logic — use cases, services]
- ⏳ [task]
> ~N files, ~N lines

#### Commit 3: [API/UI layer — controllers, routes, components]
- ⏳ [task]
> ~N files, ~N lines

#### Commit 4: [tests]
- ⏳ [task]
> ~N files, ~N lines

## Progress tracker
| Service | Commits planned | Commits done | Tests | Status |
|---------|:-:|:-:|:-:|:-:|
| | N | 0 | ⏳ | ⏳ |

## QA
- ⏳ Cross-service check
- ⏳ QA ruthless
- ⏳ Merge prep

## Session log
- [DATE HH:MM]: Plan created
`;
}

// ─── Update local orchestrator/ components ──────────────────
// Called by `update` when run from a workspace that contains orchestrator/
// or from inside orchestrator/ itself.
function updateLocal() {
  const cwd = process.cwd();
  // Detect if we're inside orchestrator/ or in the parent workspace
  let orchDir;
  if (fs.existsSync(path.join(cwd, "workspace.md"))) {
    orchDir = cwd; // inside orchestrator/
  } else if (fs.existsSync(path.join(cwd, "orchestrator", "workspace.md"))) {
    orchDir = path.join(cwd, "orchestrator");
  } else {
    return false; // no local orchestrator found
  }

  step(`Updating local: ${c.dim}${orchDir}${c.reset}`);
  let count = 0;

  // ── Hooks (always overwrite — security critical) ──
  const hooksDir = path.join(orchDir, ".claude", "hooks");
  if (fs.existsSync(hooksDir)) {
    generateBlockHook(hooksDir);
    count++;
    const hooksSrc = path.join(SKILLS_DIR, "hooks");
    if (fs.existsSync(hooksSrc)) {
      for (const f of fs.readdirSync(hooksSrc)) {
        if (!f.endsWith(".sh") || f === "verify-cycle-complete.sh") continue;
        copyFile(path.join(hooksSrc, f), path.join(hooksDir, f));
        fs.chmodSync(path.join(hooksDir, f), 0o755);
        count++;
      }
    }
    ok(`${count} hooks updated`);
  }

  // ── settings.json (always regenerate — hook registration) ──
  const settingsPath = path.join(orchDir, ".claude", "settings.json");
  if (fs.existsSync(path.join(orchDir, ".claude"))) {
    generateSettings(orchDir);
    ok("settings.json regenerated");
  }

  // ── Templates (always overwrite — reference docs) ──
  const templatesDir = path.join(SKILLS_DIR, "templates");
  const localTemplates = path.join(orchDir, "templates");
  if (fs.existsSync(templatesDir) && fs.existsSync(localTemplates)) {
    let tplCount = 0;
    for (const f of fs.readdirSync(templatesDir)) {
      if (f.endsWith(".md")) {
        copyFile(path.join(templatesDir, f), path.join(localTemplates, f));
        tplCount++;
      }
    }
    ok(`${tplCount} templates updated`);
  }

  // ── CLAUDE.md (always overwrite — generated file, not user content) ──
  const claudeMd = path.join(orchDir, "CLAUDE.md");
  fs.writeFileSync(claudeMd, claudeMdContent());
  ok("CLAUDE.md updated");

  // ── Plan template (always overwrite — structure only) ──
  const planTpl = path.join(orchDir, "plans", "_TEMPLATE.md");
  if (fs.existsSync(path.join(orchDir, "plans"))) {
    fs.writeFileSync(planTpl, planTemplateContent());
    ok("_TEMPLATE.md updated");
  }

  // ── NEVER touch: workspace.md, constitution.md, plans/*.md, service-profiles.md ──
  info(`${c.dim}workspace.md, constitution.md, plans/ — preserved${c.reset}`);

  return true;
}

// ─── Setup workspace ────────────────────────────────────────
function setupWorkspace(workspacePath, projectName) {
  const wsAbs = path.resolve(workspacePath);
  const orchDir = path.join(wsAbs, "orchestrator");

  // ── Structure ──
  step("Creating orchestrator/");
  mkdirp(path.join(orchDir, ".claude", "hooks"));
  mkdirp(path.join(orchDir, "plans"));
  mkdirp(path.join(orchDir, "templates"));
  ok("Structure created");

  // ── Templates ──
  const templatesDir = path.join(SKILLS_DIR, "templates");
  if (fs.existsSync(templatesDir)) {
    for (const f of fs.readdirSync(templatesDir)) {
      if (f.endsWith(".md")) copyFile(path.join(templatesDir, f), path.join(orchDir, "templates", f));
    }
    ok("Templates");
  }

  // ── workspace.md ──
  const wsMd = path.join(orchDir, "workspace.md");
  if (!fs.existsSync(wsMd)) {
    const tpl = path.join(orchDir, "templates", "workspace.template.md");
    if (fs.existsSync(tpl)) copyFile(tpl, wsMd);
    else fs.writeFileSync(wsMd, `# Workspace: ${projectName}\n\n## Projet\n[UNCONFIGURED]\n`);
    ok(`workspace.md ${c.dim}[UNCONFIGURED]${c.reset}`);
  } else {
    warn("workspace.md exists — skipped");
  }

  // ── constitution.md ──
  const constMd = path.join(orchDir, "constitution.md");
  if (!fs.existsSync(constMd)) {
    const tpl = path.join(orchDir, "templates", "constitution.template.md");
    if (fs.existsSync(tpl)) copyFile(tpl, constMd);
    else fs.writeFileSync(constMd, [
      `# Constitution — ${projectName}`, "",
      "> Define your project's non-negotiable engineering principles here.",
      "> The orchestrator and every teammate must follow these rules without exception.", "",
      "## Rules", "",
      "1. **[Rule name].** [Description — what, why, and when it applies]", "",
      "2. **[Rule name].** [Description]", "",
      "<!-- Add more rules as needed. Keep each rule actionable and verifiable. -->"
    ].join("\n"));
    ok(`constitution.md ${c.dim}(template)${c.reset}`);
  } else {
    warn("constitution.md exists — skipped");
  }

  // ── Hooks ──
  step("Installing hooks");
  const hooksDir = path.join(orchDir, ".claude", "hooks");
  generateBlockHook(hooksDir);
  const hooksSrc = path.join(SKILLS_DIR, "hooks");
  let hookCount = 1;
  if (fs.existsSync(hooksSrc)) {
    for (const f of fs.readdirSync(hooksSrc)) {
      if (!f.endsWith(".sh") || f === "verify-cycle-complete.sh") continue;
      copyFile(path.join(hooksSrc, f), path.join(hooksDir, f));
      fs.chmodSync(path.join(hooksDir, f), 0o755);
      hookCount++;
    }
  }
  ok(`${hookCount} hooks ${c.dim}(all warning-only)${c.reset}`);

  // ── Settings ──
  generateSettings(orchDir);
  ok(`settings.json ${c.dim}(env + hooks)${c.reset}`);

  // ── CLAUDE.md ──
  const claudeMd = path.join(orchDir, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) {
    fs.writeFileSync(claudeMd, claudeMdContent());
    ok("CLAUDE.md");
  } else {
    warn("CLAUDE.md exists — skipped");
  }

  // ── Plan template ──
  const planTpl = path.join(orchDir, "plans", "_TEMPLATE.md");
  if (!fs.existsSync(planTpl)) {
    fs.writeFileSync(planTpl, planTemplateContent());
    ok("Plan template");
  }

  // ── .gitignore ──
  const gi = path.join(orchDir, ".gitignore");
  if (!fs.existsSync(gi)) {
    fs.writeFileSync(gi, [
      ".claude/bash-commands.log", ".claude/worktrees/", ".claude/modified-files.log",
      "plans/*.md", "!plans/_TEMPLATE.md", "!plans/service-profiles.md", ""
    ].join("\n"));
    ok(".gitignore");
  }

  // ── Scan repos ──
  step("Scanning sibling repos");
  const repos = [];
  const reposWithoutClaude = [];

  for (const entry of fs.readdirSync(wsAbs, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "orchestrator") continue;
    const repoDir = path.join(wsAbs, entry.name);
    if (!fs.existsSync(path.join(repoDir, ".git"))) continue;
    const type = detectProjectType(repoDir);
    const hasClaude = fs.existsSync(path.join(repoDir, "CLAUDE.md"));
    repos.push({ name: entry.name, type, hasClaude });
    if (!hasClaude) reposWithoutClaude.push(entry.name);
  }

  if (repos.length === 0) {
    info(`${c.dim}No sibling repos found${c.reset}`);
  } else {
    // Tree-view output
    repos.forEach((r, i) => {
      const isLast = i === repos.length - 1;
      const branch = isLast ? "└──" : "├──";
      const claudeIcon = r.hasClaude
        ? `${c.green}CLAUDE.md ✓${c.reset}`
        : `${c.red}CLAUDE.md ✗${c.reset}`;
      const name = r.name.padEnd(22);
      console.log(`    ${c.dim}${branch}${c.reset} ${c.bold}${name}${c.reset} ${typeBadge(r.type).padEnd(25)} ${claudeIcon}`);
    });
  }

  // ── Service profiles ──
  const profileLines = [
    `# Service Profiles — ${projectName}`,
    `> Generated: ${new Date().toISOString().slice(0, 10)}`,
    "> Regenerate with `/refresh-profiles`", ""
  ];
  for (const r of repos) {
    profileLines.push(`## ${r.name} (../${r.name}/)`);
    profileLines.push(`- **Type** : ${r.type}`);
    profileLines.push(`- **CLAUDE.md** : ${r.hasClaude ? "present" : "ABSENT — /bootstrap-repo"}`);
    profileLines.push("");
  }
  fs.writeFileSync(path.join(orchDir, "plans", "service-profiles.md"), profileLines.join("\n"));

  // ── Final summary ──
  log("");
  log(`${c.green}${c.bold}  ══════════════════════════════════════════════════${c.reset}`);
  log(`${c.green}${c.bold}   Ready!${c.reset} ${c.dim}Orchestrator v${PKG.version}${c.reset}`);
  log(`${c.green}${c.bold}  ══════════════════════════════════════════════════${c.reset}`);
  log("");
  log(`  ${c.dim}Directory${c.reset}  ${orchDir}`);
  log(`  ${c.dim}Repos${c.reset}      ${repos.length} detected`);
  log(`  ${c.dim}Hooks${c.reset}      ${hookCount} scripts`);
  log(`  ${c.dim}Skills${c.reset}     9 ${c.dim}(~/.claude/skills/)${c.reset}`);
  log("");
  log(`  ${c.bold}Next steps:${c.reset}`);
  log(`    ${c.cyan}cd orchestrator/${c.reset}`);
  log(`    ${c.cyan}claude --agent workspace-init${c.reset}   ${c.dim}# first time: diagnostic + config${c.reset}`);
  log(`    ${c.dim}  └─ type "go" to start the diagnostic${c.reset}`);
  log(`    ${c.cyan}claude --agent team-lead${c.reset}        ${c.dim}# orchestration sessions${c.reset}`);
  if (reposWithoutClaude.length > 0) {
    log("");
    warn(`${reposWithoutClaude.length} repo(s) without CLAUDE.md: ${c.bold}${reposWithoutClaude.join(", ")}${c.reset}`);
    info(`workspace-init can generate them`);
  }
  log("");
}

// ─── Doctor ─────────────────────────────────────────────────
function doctor() {
  log(BANNER_SMALL);
  step("Diagnostic");

  const checks = [];
  function check(name, isOk, detail) {
    checks.push({ name, ok: isOk, detail });
    isOk ? ok(name) : fail(`${name} — ${detail}`);
  }

  // Version
  const installed = readVersion();
  check("Installed version",
    installed === PKG.version,
    installed ? `v${installed} (package is v${PKG.version})` : "not installed — run: npx cc-workspace update"
  );

  // Global dirs
  check("~/.claude/skills/", fs.existsSync(GLOBAL_SKILLS), "missing");
  check("~/.claude/rules/", fs.existsSync(GLOBAL_RULES), "missing");
  check("~/.claude/agents/", fs.existsSync(GLOBAL_AGENTS), "missing");

  // Skills count
  if (fs.existsSync(GLOBAL_SKILLS)) {
    const skills = fs.readdirSync(GLOBAL_SKILLS, { withFileTypes: true }).filter(e => e.isDirectory());
    check(`Skills (${skills.length}/9)`, skills.length >= 9, `only ${skills.length} found`);
  }

  // Rules
  for (const r of ["context-hygiene.md", "model-routing.md"]) {
    check(`Rule: ${r}`, fs.existsSync(path.join(GLOBAL_RULES, r)), "missing");
  }

  // Agents
  for (const a of ["team-lead.md", "implementer.md", "workspace-init.md"]) {
    check(`Agent: ${a}`, fs.existsSync(path.join(GLOBAL_AGENTS, a)), "missing");
  }

  // jq
  let jqOk = false;
  try { execSync("jq --version", { stdio: "pipe" }); jqOk = true; } catch {}
  check("jq installed", jqOk, "required for hooks — brew install jq");

  // Local orchestrator/ check
  const cwd = process.cwd();
  const orchDir = path.join(cwd, "orchestrator");
  const inOrch = fs.existsSync(path.join(cwd, "workspace.md"));
  const hasOrch = fs.existsSync(orchDir);

  if (inOrch) {
    step("Local workspace (inside orchestrator/)");
    check("workspace.md", true, "");
    check("constitution.md", fs.existsSync(path.join(cwd, "constitution.md")), "missing");
    check("plans/", fs.existsSync(path.join(cwd, "plans")), "missing");
    check("templates/", fs.existsSync(path.join(cwd, "templates")), "missing");
    check(".claude/hooks/", fs.existsSync(path.join(cwd, ".claude", "hooks")), "missing");
    const configured = !fs.readFileSync(path.join(cwd, "workspace.md"), "utf8").includes("[UNCONFIGURED]");
    check("workspace.md configured", configured, "[UNCONFIGURED] — run: claude --agent workspace-init");
  } else if (hasOrch) {
    step("Local workspace (orchestrator/ found)");
    check("orchestrator/workspace.md", fs.existsSync(path.join(orchDir, "workspace.md")), "missing — run init");
  } else {
    log(`\n  ${c.dim}No orchestrator/ found in cwd.${c.reset}`);
  }

  // Summary
  const failed = checks.filter(x => !x.ok);
  log("");
  hr();
  if (failed.length === 0) {
    log(`  ${c.bgGreen} ALL CHECKS PASSED ${c.reset}`);
  } else {
    log(`  ${c.bgRed} ${failed.length} ISSUE(S) FOUND ${c.reset}`);
  }
  log("");
}

// ─── CLI ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init": {
    const workspace = args[1] || ".";
    const name = args[2] || "My Project";
    log(BANNER);
    installGlobals(false);
    setupWorkspace(workspace, name);
    break;
  }

  case "update": {
    const force = args.includes("--force");
    log(BANNER);
    const updated = installGlobals(force);
    const localUpdated = (updated || force) ? updateLocal() : false;
    if (!updated && !force) {
      log(`\n  ${c.dim}Already up to date. Use --force to reinstall.${c.reset}\n`);
    } else {
      if (localUpdated) {
        log(`\n  ${c.green}${c.bold}Update complete (globals + local orchestrator/).${c.reset}\n`);
      } else {
        log(`\n  ${c.green}${c.bold}Update complete (globals only — no local orchestrator/ found).${c.reset}\n`);
      }
    }
    break;
  }

  case "doctor": {
    doctor();
    break;
  }

  case "version":
  case "--version":
  case "-v": {
    const installed = readVersion();
    log(`${c.cyan}${c.bold}cc-workspace${c.reset} v${PKG.version}`);
    if (installed && installed !== PKG.version) {
      log(`  ${c.dim}installed globals: v${installed}${c.reset}`);
    }
    break;
  }

  case "help":
  case "--help":
  case "-h":
  case undefined: {
    log(BANNER);
    log(`  ${c.bold}Usage:${c.reset}`);
    log("");
    log(`    ${c.cyan}npx cc-workspace init${c.reset} ${c.dim}[path] ["Project Name"]${c.reset}`);
    log(`      Setup orchestrator/ in the target workspace.`);
    log(`      Installs global skills/rules/agents if version is newer.`);
    log("");
    log(`    ${c.cyan}npx cc-workspace update${c.reset} ${c.dim}[--force]${c.reset}`);
    log(`      Update global components (skills, rules, agents).`);
    log(`      Also updates local orchestrator/ if found (hooks, settings, CLAUDE.md, templates).`);
    log(`      Never overwrites: workspace.md, constitution.md, plans/.`);
    log("");
    log(`    ${c.cyan}npx cc-workspace doctor${c.reset}`);
    log(`      Check all components are installed and consistent.`);
    log("");
    log(`    ${c.cyan}npx cc-workspace version${c.reset}`);
    log(`      Show package and installed versions.`);
    log("");
    hr();
    log(`  ${c.bold}After init:${c.reset}`);
    log(`    ${c.cyan}cd orchestrator/${c.reset}`);
    log(`    ${c.cyan}claude --agent workspace-init${c.reset}   ${c.dim}# first time${c.reset}`);
    log(`    ${c.dim}  └─ type "go" to start the diagnostic${c.reset}`);
    log(`    ${c.cyan}claude --agent team-lead${c.reset}        ${c.dim}# work sessions${c.reset}`);
    log("");
    break;
  }

  default: {
    fail(`Unknown command: ${command}`);
    log(`  Run: ${c.cyan}npx cc-workspace --help${c.reset}`);
    process.exit(1);
  }
}
