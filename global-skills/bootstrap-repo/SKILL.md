---
name: bootstrap-repo
description: >
  Generate a high-quality CLAUDE.md for a repository that doesn't have one.
  Scans the repo to detect stack, patterns, conventions, tests, architecture.
  Use when user says "bootstrap", "init CLAUDE.md", "generate CLAUDE.md",
  or when a repo is detected without CLAUDE.md during setup.
argument-hint: "[repo-path]"
context: fork
agent: general-purpose
disable-model-invocation: true
model: haiku
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Bootstrap Repo — Generate CLAUDE.md

Scan the target repo and generate a comprehensive CLAUDE.md.

## What to scan

1. **Package files**: package.json, composer.json, requirements.txt, Cargo.toml, go.mod
2. **Framework detection**: look for config files (artisan, nuxt.config, next.config, etc.)
3. **Directory structure**: src/, app/, tests/, migrations/, etc.
4. **Test setup**: detect test runner (PHPUnit, Vitest, pytest, Jest, etc.) and config
5. **Linting/formatting**: .eslintrc, .prettierrc, phpcs.xml, ruff.toml, etc.
6. **Auth patterns**: grep for auth middleware, JWT, OAuth, Keycloak, etc.
7. **Architecture patterns**: look for Controllers, Services, Repositories, Composables, Stores
8. **Existing conventions**: check for README, CONTRIBUTING, .editorconfig
9. **Git conventions**: recent commit messages format

## Output format

Write the CLAUDE.md in the target repo root:

```markdown
# [Repo Name]

## Stack
- **Language**: [detected]
- **Framework**: [detected]
- **Database**: [detected if applicable]
- **Package manager**: [detected]

## Architecture
[Describe the directory structure and patterns found]

## Commands
- **Dev server**: `[detected command]`
- **Tests**: `[detected command]`
- **Lint**: `[detected command]`
- **Build**: `[detected command]`

## Conventions
- [Detected patterns: naming, file organization, imports]
- [Commit format if detected]

## Auth
[Auth mechanism if detected]

## Key patterns
[Important patterns to follow when adding code]

## Testing
- **Runner**: [detected]
- **Location**: [test directory]
- **Naming**: [pattern detected]
```

Only include what you actually find. Do NOT invent conventions.
Mark uncertain items with "[verify]".
