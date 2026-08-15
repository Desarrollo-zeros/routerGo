# RouterGo Development MCP

A small read-only MCP server for Codex/agent development. It provides canonical RouterGo rules/spec/skills without giving the agent write access or production secrets.

## Run
```bash
pnpm mcp:routergo
```

Codex example is in `.codex/config.toml.example`.

## Tools
- `routergo_context`: high-level project pointers.
- `routergo_read`: read an allow-listed project guidance file.
- `routergo_classify_task`: deterministic development-task classifier that recommends a Codex RouterGo skill.

This MCP is for development only. Production runtime session classification/SkillRegistry belongs inside RouterGo application ports and may use a configured low-cost LLM classifier.
