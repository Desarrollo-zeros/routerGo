# RouterGo + GitHub Spec Kit

RouterGo uses Spec-Driven Development. The canonical platform feature is `specs/001-routergo-platform/`.

## Codex flow
1. Read `.specify/memory/constitution.md` and `AGENTS.md`.
2. For a new capability, create a new numbered folder under `specs/` rather than editing the platform spec indiscriminately.
3. Follow: clarify -> specify -> plan -> tasks -> analyze -> implement -> converge.
4. Keep every task traceable to a requirement and an independently testable user story.
5. Re-run the constitution check after technical design changes.

GitHub Spec Kit supports Codex as a skills-based integration. When the `specify` CLI is available, initialize/update Codex integration with the Codex integration and skills mode, then keep RouterGo custom skills under `.agents/skills/routergo-*`.

Project-local artifacts in this repository are intentionally self-contained so an LLM can execute the plan even when the Spec Kit CLI is not installed.
