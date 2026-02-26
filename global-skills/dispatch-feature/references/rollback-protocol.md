# Rollback & Failed Dispatch Protocol

Reference file for team-lead and dispatch-feature. Loaded on-demand.

## Rollback protocol

If an implementer corrupts the session branch (bad merge, broken state):

1. Identify the last known good commit hash (from plan's session log)
2. Spawn a Task subagent (Bash):
   ```
   git -C ../[repo] update-ref refs/heads/session/{name} [good-commit-hash]
   ```
3. Mark the commit unit ❌ in the plan with reason
4. Re-dispatch with corrected instructions

If the branch is unrecoverable:
1. Delete the branch: `git -C ../[repo] branch -D session/{name}`
2. Recreate from source: `git -C ../[repo] branch session/{name} {source_branch}`
3. Re-dispatch ALL commit units for this service from scratch
4. Warn the user — this resets all progress on this service

## Failed dispatch tracking

After 2 failed re-dispatches of a commit unit:

1. Mark as `❌ ESCALATED` in the plan
2. Record in the plan's **Failed dispatches** section:
   - Commit unit title
   - Failure reason (from implementer report)
   - Attempted fixes
   - Suggested resolution
3. **STOP the wave** — do NOT continue to the next commit unit
4. Present the failure to the user, ask for direction
5. Resume only after user provides corrective action
