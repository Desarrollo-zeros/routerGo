# Quickstart for an implementation agent

1. Read `AGENTS.md` and constitution.
2. Run baseline tests before changing code.
3. Pick the first unchecked task whose dependencies are complete.
4. Load the matching RouterGo skill from `.agents/skills/`.
5. Inspect existing implementation; never assume the plan means a file is absent/present.
6. Write/adjust failing tests for critical business behavior.
7. Implement the smallest vertical slice while keeping every code file <200 lines.
8. Run typecheck/lint/test/build/line/architecture gates.
9. Update task status and affected spec/ADR if reality changed.
10. Stop on ambiguous economic/security/provider behavior rather than inventing a rule.

For Codex, optionally configure `.codex/config.toml.example` into the user's Codex config and run `pnpm mcp:routergo` as the local read-only RouterGo MCP server.
