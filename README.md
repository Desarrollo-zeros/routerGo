# RouterGo

RouterGo is an ad-funded multi-provider AI platform where users earn internal GoCredits through approved engagement and spend them on AI access through the PWA or RouterGo developer API. The platform also includes operator CMS/admin, advertiser self-service, challenges, realtime battles, treasure hunts, and a policy-driven runtime skill router.

## Start here
- Agent rules: `AGENTS.md`
- Constitution: `.specify/memory/constitution.md`
- Platform specification: `specs/001-routergo-platform/spec.md`
- Technical plan: `specs/001-routergo-platform/plan.md`
- Executable tasks: `specs/001-routergo-platform/tasks.md`
- Codex skills: `.agents/skills/routergo-*`
- Local development MCP: `tools/mcp-routergo/`

## Existing stack
The repository remains a TypeScript/pnpm monorepo with API/web applications and evolves incrementally under the Rev.7 plan. Do not rewrite working domains merely to match new folders; converge through tested vertical slices.

## Quality
Every versioned code file must remain under 200 physical lines. SOLID/hexagonal boundaries, bounded retries, accounting idempotency, responsive WCAG-oriented UI, and Spec Kit traceability are mandatory.
