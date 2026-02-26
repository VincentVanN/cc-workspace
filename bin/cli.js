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
  // Use $CLAUDE_PROJECT_DIR so hooks resolve correctly even when
  // subagents run from a different CWD (e.g. worktree in sibling repo)
  const hp = '${CLAUDE_PROJECT_DIR:-.}/.claude/hooks';

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
        // block-orchestrator-writes.sh is NOT here — it's in team-lead agent
        // frontmatter only. Putting it in settings.json would block teammates
        // from writing in their worktrees.
        // guard-session-checkout.sh is NOT here — it's in implementer agent
        // frontmatter only. team-lead doesn't have Bash, and teammates don't
        // inherit orchestrator hooks.
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
      Notification: [
        withoutMatcher("notify-user.sh", 5)
      ]
    }
  };
  fs.writeFileSync(path.join(orchDir, ".claude", "settings.json"), JSON.stringify(settings, null, 2) + "\n");
}

// ─── Block hook ──────────────────────────────────────────────
// block-orchestrator-writes is now ONLY in team-lead agent frontmatter.
// It is NOT in settings.json (would be inherited by teammates, blocking their writes).
// The generateBlockHook() function was removed in v4.1.4.

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
claude --agent e2e-validator     # E2E validation of completed plans
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
- Active sessions: \`./.sessions/*.json\`
- E2E config: \`./e2e/e2e-config.md\`
- E2E reports: \`./e2e/reports/\`

## Skills (13)
- **dispatch-feature**: 4 modes, clarify → plan → waves → collect → verify
- **qa-ruthless**: adversarial QA, min 3 findings per service
- **cross-service-check**: inter-repo consistency
- **incident-debug**: multi-layer diagnostic
- **plan-review**: plan sanity check (haiku)
- **merge-prep**: pre-merge, conflicts, PR summaries
- **cycle-retrospective**: post-cycle learning (haiku)
- **refresh-profiles**: re-reads repo CLAUDE.md files (haiku)
- **bootstrap-repo**: generates a CLAUDE.md for a repo (haiku)
- **e2e-validator**: E2E validation of completed plans (beta) — containers + Chrome
- **/session**: list, status, close parallel sessions
- **/doctor**: full workspace diagnostic
- **/cleanup**: remove orphan worktrees + stale sessions

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
14. Session branches for parallel isolation — teammates use session/{name}, never create own branches
15. Never \`git checkout -b\` in repos — use \`git branch\` (no checkout) to avoid disrupting parallel sessions
16. E2E validation via \`claude --agent e2e-validator\` after plans are complete
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
| Service | Impacted | Session Branch | Teammate | Status |
|---------|----------|----------------|----------|--------|
| | yes/no | session/[name] | | ⏳ |

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

## Failed dispatches
<!-- Commit units that failed 2+ times are recorded here for user review -->

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
    // Clean obsolete hooks before copying new ones
    const obsoleteHooks = ["block-orchestrator-writes.sh", "worktree-create-context.sh", "verify-cycle-complete.sh", "guard-session-checkout.sh"];
    for (const f of obsoleteHooks) {
      const fp = path.join(hooksDir, f);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    const hooksSrc = path.join(SKILLS_DIR, "hooks");
    if (fs.existsSync(hooksSrc)) {
      for (const f of fs.readdirSync(hooksSrc)) {
        if (!f.endsWith(".sh")) continue;
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

  // ── .sessions/ (create if missing) ──
  const sessionsDir = path.join(orchDir, ".sessions");
  if (!fs.existsSync(sessionsDir)) {
    mkdirp(sessionsDir);
    ok(".sessions/ created");
  }

  // ── e2e/ (create if missing — never overwrite existing) ──
  const e2eDir = path.join(orchDir, "e2e");
  if (!fs.existsSync(e2eDir)) {
    mkdirp(path.join(e2eDir, "tests"));
    mkdirp(path.join(e2eDir, "chrome", "scenarios"));
    mkdirp(path.join(e2eDir, "chrome", "screenshots"));
    mkdirp(path.join(e2eDir, "chrome", "gifs"));
    mkdirp(path.join(e2eDir, "reports"));
    ok("e2e/ directory created");
  }

  // ── NEVER touch: workspace.md, constitution.md, plans/*.md, e2e/ ──
  info(`${c.dim}workspace.md, constitution.md, plans/, e2e/ — preserved${c.reset}`);

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
  mkdirp(path.join(orchDir, ".sessions"));
  mkdirp(path.join(orchDir, "e2e", "tests"));
  mkdirp(path.join(orchDir, "e2e", "chrome", "scenarios"));
  mkdirp(path.join(orchDir, "e2e", "chrome", "screenshots"));
  mkdirp(path.join(orchDir, "e2e", "chrome", "gifs"));
  mkdirp(path.join(orchDir, "e2e", "reports"));
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
  const hooksSrc = path.join(SKILLS_DIR, "hooks");
  let hookCount = 0;
  if (fs.existsSync(hooksSrc)) {
    for (const f of fs.readdirSync(hooksSrc)) {
      if (!f.endsWith(".sh")) continue;
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
      ".sessions/",
      "plans/*.md", "!plans/_TEMPLATE.md", "!plans/service-profiles.md",
      "e2e/chrome/screenshots/", "e2e/chrome/gifs/", "e2e/reports/",
      "e2e/docker-compose.e2e.yml", "e2e/e2e-config.md", ""
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
  log(`  ${c.dim}Skills${c.reset}     13 ${c.dim}(~/.claude/skills/)${c.reset}`);
  log("");
  log(`  ${c.bold}Next steps:${c.reset}`);
  log(`    ${c.cyan}cd orchestrator/${c.reset}`);
  log(`    ${c.cyan}claude --agent workspace-init${c.reset}   ${c.dim}# first time: diagnostic + config${c.reset}`);
  log(`    ${c.dim}  └─ type "go" to start the diagnostic${c.reset}`);
  log(`    ${c.cyan}claude --agent team-lead${c.reset}        ${c.dim}# orchestration sessions${c.reset}`);
  log(`    ${c.cyan}claude --agent e2e-validator${c.reset}    ${c.dim}# E2E validation (beta)${c.reset}`);
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
    check(`Skills (${skills.length}/13)`, skills.length >= 13, `only ${skills.length} found`);
  }

  // Rules
  for (const r of ["context-hygiene.md", "model-routing.md"]) {
    check(`Rule: ${r}`, fs.existsSync(path.join(GLOBAL_RULES, r)), "missing");
  }

  // Agents
  for (const a of ["team-lead.md", "implementer.md", "workspace-init.md", "e2e-validator.md"]) {
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
    check(".sessions/", fs.existsSync(path.join(cwd, ".sessions")), "missing — run: npx cc-workspace update");
    check("e2e/", fs.existsSync(path.join(cwd, "e2e")), "missing — run: npx cc-workspace update");
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

// ─── Session helpers ─────────────────────────────────────────
function findOrchDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "workspace.md"))) return cwd;
  if (fs.existsSync(path.join(cwd, "orchestrator", "workspace.md")))
    return path.join(cwd, "orchestrator");
  return null;
}

function readSessions(orchDir) {
  const sessDir = path.join(orchDir, ".sessions");
  if (!fs.existsSync(sessDir)) return [];
  return fs.readdirSync(sessDir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(sessDir, f), "utf8"));
      } catch { return null; }
    })
    .filter(Boolean);
}

function sessionStatusBadge(status) {
  const badges = {
    active: `${c.green}active${c.reset}`,
    closed: `${c.dim}closed${c.reset}`,
    closing: `${c.yellow}closing${c.reset}`,
  };
  return badges[status] || status;
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
    log(`    ${c.cyan}npx cc-workspace session list${c.reset}`);
    log(`      Show all active sessions and their branches.`);
    log("");
    log(`    ${c.cyan}npx cc-workspace session status${c.reset} ${c.dim}<name>${c.reset}`);
    log(`      Show detailed session info: commits per repo on session branch.`);
    log("");
    log(`    ${c.cyan}npx cc-workspace session close${c.reset} ${c.dim}<name>${c.reset}`);
    log(`      Interactive close: create PRs, delete branches, clean up.`);
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
    log(`    ${c.cyan}claude --agent e2e-validator${c.reset}    ${c.dim}# E2E validation (beta)${c.reset}`);
    log("");
    break;
  }

  case "session": {
    const subCmd = args[1];
    const orchDir = findOrchDir();
    if (!orchDir) {
      fail("No orchestrator/ found. Run from workspace root or orchestrator/.");
      process.exit(1);
    }

    switch (subCmd) {
      case "list": {
        log(BANNER_SMALL);
        step("Active sessions");
        const sessions = readSessions(orchDir);
        if (sessions.length === 0) {
          info(`${c.dim}No sessions found in .sessions/${c.reset}`);
        } else {
          for (const s of sessions) {
            const repoCount = Object.keys(s.repos || {}).length;
            log(`  ${c.bold}${s.name}${c.reset}  ${sessionStatusBadge(s.status)}  ${c.dim}created: ${s.created}${c.reset}  ${c.dim}repos: ${repoCount}${c.reset}`);
            for (const [name, repo] of Object.entries(s.repos || {})) {
              const branchIcon = repo.branch_created ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
              log(`    ${c.dim}├──${c.reset} ${name}  ${repo.session_branch}  ${branchIcon}`);
            }
          }
        }
        log("");
        break;
      }

      case "status": {
        const sessionName = args[2];
        if (!sessionName) {
          fail("Usage: cc-workspace session status <name>");
          process.exit(1);
        }
        log(BANNER_SMALL);
        const sessionFile = path.join(orchDir, ".sessions", `${sessionName}.json`);
        if (!fs.existsSync(sessionFile)) {
          fail(`Session "${sessionName}" not found`);
          process.exit(1);
        }
        const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
        step(`Session: ${session.name}`);
        log(`  ${c.dim}Status${c.reset}   ${sessionStatusBadge(session.status)}`);
        log(`  ${c.dim}Created${c.reset}  ${session.created}`);
        log("");

        for (const [name, repo] of Object.entries(session.repos || {})) {
          const repoPath = path.resolve(orchDir, repo.path);
          log(`  ${c.bold}${name}${c.reset} ${c.dim}(${repo.path})${c.reset}`);
          log(`    source: ${repo.source_branch}  →  session: ${repo.session_branch}`);
          if (repo.branch_created && fs.existsSync(path.join(repoPath, ".git"))) {
            try {
              const commits = execSync(
                `git -C "${repoPath}" log ${repo.session_branch} --oneline --not ${repo.source_branch} 2>/dev/null || echo "(no commits yet)"`,
                { encoding: "utf8", timeout: 5000 }
              ).trim();
              log(`    ${c.dim}commits:${c.reset}`);
              for (const line of commits.split("\n").slice(0, 10)) {
                log(`      ${line}`);
              }
            } catch {
              log(`    ${c.yellow}(could not read commits)${c.reset}`);
            }
          }
          log("");
        }
        break;
      }

      case "close": {
        const sessionName = args[2];
        if (!sessionName) {
          fail("Usage: cc-workspace session close <name>");
          process.exit(1);
        }
        const sessionFile = path.join(orchDir, ".sessions", `${sessionName}.json`);
        if (!fs.existsSync(sessionFile)) {
          fail(`Session "${sessionName}" not found`);
          process.exit(1);
        }
        const session = JSON.parse(fs.readFileSync(sessionFile, "utf8"));

        log(BANNER_SMALL);
        step(`Closing session: ${session.name}`);
        log("");

        const readline = require("readline");
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q) => new Promise(r => rl.question(q, r));

        (async () => {
          // Step 1: offer to create PRs
          for (const [name, repo] of Object.entries(session.repos || {})) {
            if (!repo.branch_created) continue;
            const repoPath = path.resolve(orchDir, repo.path);
            const answer = await ask(
              `  Create PR ${c.cyan}${repo.session_branch}${c.reset} → ${c.cyan}${repo.source_branch}${c.reset} in ${c.bold}${name}${c.reset}? [y/N] `
            );
            if (answer.toLowerCase() === "y") {
              try {
                const result = execSync(
                  `cd "${repoPath}" && gh pr create --base "${repo.source_branch}" --head "${repo.session_branch}" --title "${session.name}: ${name}" --body "Session: ${session.name}"`,
                  { encoding: "utf8", timeout: 30000 }
                );
                ok(`PR created: ${result.trim()}`);
              } catch (e) {
                fail(`PR creation failed: ${e.stderr || e.message}`);
              }
            }
          }

          // Step 2: offer to delete session branches
          for (const [name, repo] of Object.entries(session.repos || {})) {
            if (!repo.branch_created) continue;
            const repoPath = path.resolve(orchDir, repo.path);
            // Check for unpushed commits before offering deletion
            let unpushed = "";
            try {
              unpushed = execSync(
                `git -C "${repoPath}" log "${repo.session_branch}" --oneline --not --remotes 2>/dev/null`,
                { encoding: "utf8", timeout: 5000 }
              ).trim();
            } catch { /* branch may not have remote tracking */ }
            if (unpushed) {
              warn(`${name}: ${unpushed.split("\\n").length} unpushed commit(s) on ${repo.session_branch}`);
            }
            const answer = await ask(
              `  Delete branch ${c.cyan}${repo.session_branch}${c.reset} in ${c.bold}${name}${c.reset}?${unpushed ? ` ${c.red}(has unpushed commits)${c.reset}` : ""} [y/N] `
            );
            if (answer.toLowerCase() === "y") {
              try {
                // Use -D (force) — user already confirmed, branch may not be merged yet
                execSync(`git -C "${repoPath}" branch -D "${repo.session_branch}"`,
                  { encoding: "utf8", timeout: 5000 });
                ok(`Branch deleted in ${name}`);
              } catch (e) {
                fail(`Branch deletion failed in ${name}: ${e.stderr || e.message}`);
              }
            }
          }

          // Step 3: offer to delete session JSON
          const answer = await ask(
            `  Delete session file ${c.dim}.sessions/${sessionName}.json${c.reset}? [y/N] `
          );
          if (answer.toLowerCase() === "y") {
            fs.unlinkSync(sessionFile);
            ok("Session file deleted");
          } else {
            session.status = "closed";
            fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2) + "\n");
            ok("Session marked as closed");
          }

          rl.close();
          log("");
        })();
        break;
      }

      default:
        if (!subCmd) {
          log(BANNER_SMALL);
          log(`\n  ${c.bold}Usage:${c.reset}`);
          log(`    ${c.cyan}cc-workspace session list${c.reset}              ${c.dim}Show active sessions${c.reset}`);
          log(`    ${c.cyan}cc-workspace session status${c.reset} ${c.dim}<name>${c.reset}    ${c.dim}Detailed session info${c.reset}`);
          log(`    ${c.cyan}cc-workspace session close${c.reset} ${c.dim}<name>${c.reset}     ${c.dim}Interactive close${c.reset}`);
          log("");
        } else {
          fail(`Unknown session subcommand: ${subCmd}`);
          log(`  Usage: ${c.cyan}cc-workspace session${c.reset} ${c.dim}list | status <name> | close <name>${c.reset}`);
          process.exit(1);
        }
    }
    break;
  }

  default: {
    fail(`Unknown command: ${command}`);
    log(`  Run: ${c.cyan}npx cc-workspace --help${c.reset}`);
    process.exit(1);
  }
}
