---
name: doctor
description: >
  Full diagnostic of the orchestrator workspace installation. Checks global
  components (skills, rules, agents), local structure (hooks, settings,
  workspace.md), and repo health (CLAUDE.md, test frameworks).
  Use: /doctor
argument-hint: ""
context: fork
model: haiku
allowed-tools: Bash, Read, Glob, Grep
---

# Doctor — Workspace Diagnostic

Run a comprehensive health check of the orchestrator installation.

## Checks to perform

### 1. Global components (~/.claude/)
```bash
# Version
cat ~/.claude/.orchestrator-version 2>/dev/null || echo "NOT INSTALLED"
```

Check existence of:
- `~/.claude/skills/` — count skill directories (expect 10+)
- `~/.claude/rules/context-hygiene.md`
- `~/.claude/rules/model-routing.md`
- `~/.claude/agents/team-lead.md`
- `~/.claude/agents/implementer.md`
- `~/.claude/agents/workspace-init.md`
- `~/.claude/agents/e2e-validator.md`

### 2. Local orchestrator structure
Find orchestrator dir (./workspace.md or ./orchestrator/workspace.md).

Check:
- `workspace.md` exists and is configured (no `[UNCONFIGURED]`)
- `constitution.md` exists and has rules
- `plans/` directory exists
- `plans/_TEMPLATE.md` exists
- `templates/` directory exists
- `.claude/settings.json` exists and has hooks config
- `.claude/hooks/` — count .sh files, verify executable permissions
- `.sessions/` directory exists
- `e2e/` directory exists

### 3. Dependencies
```bash
jq --version 2>/dev/null || echo "MISSING"
git --version 2>/dev/null || echo "MISSING"
docker compose version 2>/dev/null || echo "MISSING (optional, for E2E)"
gh --version 2>/dev/null || echo "MISSING (optional, for PRs)"
```

### 4. Sibling repos health
For each directory in `../` with `.git/`:
- Has CLAUDE.md? (yes/no)
- Has `.claude/settings.json`? (yes/no)
- Detected type (package.json → Vue/React/Node, composer.json → PHP, etc.)
- Has test config? (vitest.config.*, phpunit.xml, pytest.ini, etc.)
- Stale worktrees? `git worktree list` — flag any in /tmp/

### 5. Orphan worktrees
```bash
# Check for stale /tmp/ worktrees
ls -d /tmp/*-session-* /tmp/e2e-* 2>/dev/null
```

## Output format

Present results as a markdown table:

```
| Check | Status | Detail |
|-------|--------|--------|
| Installed version | ✅ | v4.5.0 |
| Skills (12/10) | ✅ | |
| workspace.md | ✅ | Configured |
| jq | ✅ | jq-1.7 |
| docker | ⚠️ | Not installed (optional) |
| repo: api | ✅ | PHP/Laravel, CLAUDE.md ✓ |
| repo: front | ⚠️ | Vue/Quasar, CLAUDE.md ✗ |
| Orphan worktrees | ✅ | None |
```

End with:
- If all OK: "All checks passed."
- If issues: list recommended fixes.
