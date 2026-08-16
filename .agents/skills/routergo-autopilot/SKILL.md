# RouterGo Autopilot

Use this skill when the project objective is to complete the RouterGo MVP
autonomously.

## Operating algorithm

1. Reconcile `git status`, recent history, constitution, relevant specs,
   `plan.md`, `tasks.md`, `gap-analysis.md`, tests, and the checkpoint at
   `.agents/state/routergo-autopilot.md`.
2. Build the dependency graph from task dependencies and current evidence.
   Select the smallest unblocked MVP slice; do not follow task numbers blindly.
3. Load only the relevant RouterGo specialist skills and bounded-context code.
4. Add regression tests for economy, security, concurrency, routing, state,
   or provider invariants before claiming completion.
5. Implement with hexagonal boundaries, PostgreSQL as financial authority,
   forward-only migrations, no secrets, no business hardcoding, and the code
   size/complexity limits from the constitution.
6. Run the applicable quality gates, classify failures, and fix repository or
   environment causes instead of weakening gates.
7. Update documentation, gap analysis, tasks, and the small checkpoint only
   when evidence supports the change.
8. Review the staged diff for ownership and unrelated changes, then create an
   atomic Lore-format commit without pushing.
9. Recompute dependencies and continue until the MVP is green or a genuine
   human blocker exists.

Never use reset/clean/force checkout, hide failures with `|| true`, disable
quality rules, edit applied migrations, or mark a task done without fresh
evidence.
