---
name: session
description: >
  Manage parallel feature sessions. List active sessions, show detailed status
  with commits per repo, or close a session (PRs + branch cleanup).
  Use: /session, /session status <name>, /session close <name>.
argument-hint: "[list | status <name> | close <name>]"
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# Session Manager

You manage parallel feature sessions from the orchestrator.

## Detect context

1. Find the orchestrator directory:
   - If `./workspace.md` exists → you're in orchestrator/
   - If `../orchestrator/workspace.md` exists → orchestrator is at `../orchestrator/`
   - Otherwise → error: "No orchestrator found. Run from orchestrator/ or its parent."

2. Read `.sessions/*.json` files to list sessions.

## Commands

### /session (no args) or /session list
List all sessions with their status:
```
For each .sessions/*.json:
  - Name, status (active/closed), created date
  - For each repo: session branch, branch_created status
  - Commit count on session branch vs source branch
```

Run for each active session repo:
```bash
git -C ../[repo] log session/[name] --oneline --not [source_branch] 2>/dev/null | wc -l
```

Present as a clean table.

### /session status <name>
Detailed view of one session:
```bash
# For each repo in the session JSON:
git -C ../[repo] log session/[name] --oneline --not [source_branch] 2>/dev/null
git -C ../[repo] diff --stat [source_branch]..session/[name] 2>/dev/null
```

Show: commits list, files changed, lines added/removed.

### /session close <name>
Interactive close — ask before EACH action:

1. **For each repo**: offer to create PR
   ```bash
   gh pr create --repo [remote] --base [source_branch] --head session/[name] \
     --title "[session-name]: [repo]" --body "Session: [session-name]"
   ```
   Ask: "Create PR session/X → source in [repo]? [y/N]"

2. **For each repo**: offer to delete session branch
   First check for unpushed commits:
   ```bash
   git -C ../[repo] log session/[name] --oneline --not --remotes 2>/dev/null
   ```
   If unpushed: warn before deletion.
   Ask: "Delete branch session/X in [repo]? [y/N]"
   ```bash
   git -C ../[repo] branch -D session/[name]
   ```

3. **Session file**: offer to delete or mark closed
   Ask: "Delete .sessions/[name].json? [y/N]"
   If no → mark status as "closed" in the JSON.

## Output format
Use clean markdown tables. Keep it concise.
