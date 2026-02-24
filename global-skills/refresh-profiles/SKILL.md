---
name: refresh-profiles
description: >
  Regenerate service-profiles.md by reading CLAUDE.md from all repos
  listed in workspace.md. Use when conventions changed, or user says
  "refresh profiles", "update profiles", "re-read CLAUDE.md files".
context: fork
agent: Explore
disable-model-invocation: true
model: haiku
allowed-tools: Read, Write, Glob, Grep
---

# Refresh Service Profiles

1. Read `./workspace.md` to get the list of repos and their paths
2. For each repo listed, read its CLAUDE.md
3. Extract per repo: stack, patterns, auth, tests, conventions, special notes
4. Write result to `./plans/service-profiles.md`
5. Add today's date in the header

If a repo doesn't exist or has no CLAUDE.md, mark it as "[not found]".
Do NOT invent information — only extract what's explicitly stated.
