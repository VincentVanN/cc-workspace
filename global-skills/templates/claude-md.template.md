# CLAUDE.md — [REPO_NAME]

> [REPO_DESCRIPTION — one line]

## Tech stack

| Technology | Version | Notes |
|------------|---------|-------|
| [language] | [version] | |
| [framework] | [version] | |
| [database] | [version] | [usage] |
| [test framework] | [version] | |

## Architecture

<!-- Describe the architecture pattern and show the directory tree -->

```
[repo]/
├── src/           ← [description]
├── tests/         ← [description]
└── ...
```

<!-- Explain the layering or module organization -->

## Critical rules

<!-- Numbered rules. Each rule has a short name and ✅/❌ examples.
     Keep only rules that an AI agent MUST know to avoid mistakes.
     Not a style guide — only rules where violations cause bugs or break patterns. -->

### 1. [Rule name]

[One-line explanation]

```
❌ [wrong pattern]
✅ [correct pattern]
```

### 2. [Rule name]

[One-line explanation]

```
❌ [wrong pattern]
✅ [correct pattern]
```

<!-- Add more rules as needed. Typical count: 3-8 rules per repo. -->

## Naming conventions

| Type | Pattern | Example |
|------|---------|---------|
| [files] | [pattern] | [example] |
| [classes] | [pattern] | [example] |
| [functions] | [pattern] | [example] |
| [routes/endpoints] | [pattern] | [example] |

## Tests

<!-- Test framework, how to run, patterns to follow -->

**Run tests:**
```bash
[test command]
```

**Patterns:**
- [describe test organization]
- [describe mocking strategy]
- [minimum coverage if applicable]

## Anti-patterns

<!-- Two-column table: forbidden vs required. Keep it short and impactful. -->

| Forbidden | Do instead |
|-----------|-----------|
| [bad pattern] | [good pattern] |
| [bad pattern] | [good pattern] |
| [bad pattern] | [good pattern] |

## Commands

<!-- Essential commands for dev workflow -->

| Command | Description |
|---------|-------------|
| `[cmd]` | Build / compile |
| `[cmd]` | Run tests |
| `[cmd]` | Lint / format |
| `[cmd]` | Start dev server |

## Existing domains

<!-- List existing modules/domains/packages if the repo uses a modular architecture.
     Remove this section if not applicable. -->

| Domain | Path | Description |
|--------|------|-------------|
| [name] | [path] | [one-line description] |

<!-- === OPTIONAL SECTIONS (add only if relevant) === -->

<!-- ## Multi-tenancy
     Describe tenant scoping pattern, trait/mixin used, tables affected. -->

<!-- ## Auth
     Describe authentication mechanism, tokens, middleware, guards. -->

<!-- ## Pre-delivery checklist
     - [ ] Tests pass
     - [ ] Lint clean
     - [ ] No dead code introduced
     - [ ] Conventions followed -->

<!-- ## Architectural decisions
     Document any ADRs (Architecture Decision Records) specific to this repo. -->

---
_Last Updated: [DATE]_
