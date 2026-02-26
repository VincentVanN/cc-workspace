---
name: cleanup
description: >
  Clean orphan worktrees, stale sessions, and temporary files left by
  crashed implementers. Safe to run anytime — only removes /tmp/ worktrees
  and closed/stale sessions.
  Use: /cleanup
argument-hint: ""
context: fork
allowed-tools: Bash, Read, Glob, Grep
---

# Cleanup — Orphan Worktree & Session Cleaner

## Step 1: Find orphan worktrees in /tmp/

```bash
# List all potential orchestrator worktrees
ls -d /tmp/*-session-* /tmp/e2e-* 2>/dev/null || echo "No worktrees found in /tmp/"
```

For each found worktree:
1. Check if it's still registered with a repo:
   ```bash
   # Find the parent repo by checking all sibling repos
   for repo in ../*/; do
     [ -d "$repo/.git" ] || continue
     git -C "$repo" worktree list 2>/dev/null | grep "/tmp/worktree-path"
   done
   ```
2. If registered but the directory is invalid → prune:
   ```bash
   git -C ../[repo] worktree prune
   ```
3. If not registered → safe to remove:
   ```bash
   rm -rf /tmp/[worktree-path]
   ```

Present what was found and ask the user before deleting:
> "Found N orphan worktrees. Remove them? [y/N]"

## Step 2: Find stale sessions

Read `.sessions/*.json`. A session is stale if:
- Status is "closed"
- Status is "active" but created more than 30 days ago

For stale sessions, show:
```
| Session | Status | Created | Repos | Action |
|---------|--------|---------|-------|--------|
| feature-old | closed | 2026-01-15 | api, front | Delete JSON? |
| feature-stuck | active | 2026-01-20 | api | Stale (37 days) |
```

Ask before each deletion.

For active stale sessions, also check if session branches exist:
```bash
git -C ../[repo] branch --list session/[name] 2>/dev/null
```

## Step 3: Clean modified-files.log

```bash
# Truncate if larger than 1000 lines
wc -l .claude/modified-files.log 2>/dev/null
```

If >1000 lines, ask to truncate to last 200 lines.

## Step 4: Docker cleanup (optional)

Check for dangling E2E containers:
```bash
docker ps -a --filter "name=e2e" --format "{{.Names}} {{.Status}}" 2>/dev/null
```

If found, offer to remove:
```bash
docker compose -f ./e2e/docker-compose.e2e.yml down -v 2>/dev/null
```

## Output

Summary of actions taken:
```
Cleanup complete:
- Removed N orphan worktrees
- Deleted N stale session files
- Pruned modified-files.log (was X lines → 200)
- Removed N dangling containers
```
