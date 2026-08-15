# RouterGo CI

The workflow at `.github/workflows/ci.yml` runs on pushes to `main` and on pull requests. It uses Node `22.20.1` and pnpm `11.19.0`, both explicitly pinned.

## Jobs

- `RouterGo / quality`: frozen install, typecheck, ESLint, file-size, dependency architecture, and plaintext-secret gates.
- `RouterGo / test`: PostgreSQL and Redis healthchecked services, migration, and the complete workspace test suite.
- `RouterGo / build`: frozen install and the workspace production build.
- `RouterGo / database`: PostgreSQL migration plus two seeds with checksum equality.
- `RouterGo / e2e`: official Chromium installation and Playwright's configured Vite web server. The tests mock API responses, so LiteLLM is not started.

All jobs use least-privilege `contents: read`, cancel superseded runs for the same ref, and have finite timeouts. Only Playwright diagnostics are uploaded, and only after an E2E failure.

## Local reproduction

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm check:lines
pnpm check:arch
pnpm check:secrets
pnpm test
pnpm build
```

For database and API tests, start the local services first with `docker compose up -d`, then use the dummy values already used by the compose stack:

```powershell
$env:DATABASE_URL = "postgres://routergo:routergo@localhost:5432/routergo"
$env:REDIS_URL = "redis://localhost:6380"
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm test
```

For E2E, install the browser once and run the configured web server:

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
```

## Required checks for `main`

Configure these exact workflow job names as required status checks in GitHub branch protection:

- `RouterGo / quality`
- `RouterGo / test`
- `RouterGo / build`
- `RouterGo / database`
- `RouterGo / e2e`

Branch protection is intentionally not changed by this repository commit.

## Troubleshooting

- A frozen-install failure means `pnpm-lock.yaml` and the manifests are out of sync; regenerate the lockfile intentionally and commit it.
- Database test failures usually mean PostgreSQL or Redis is not healthy, or the host ports `5432` and `6380` are occupied locally.
- E2E failures include `playwright-report/` and `test-results/` in the workflow artifact when Playwright creates them.
