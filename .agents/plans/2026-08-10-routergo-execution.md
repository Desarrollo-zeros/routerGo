# Plan de Ejecución — RouterGo Esfuerzo→Tokens Rev.6

**Fecha:** 2026-08-10
**Source:** `AGENTS.md` + `.agents/plans/2026-08-09-esfuerzo-tokens.md` (Rev.6)
**Estado actual verificado:** monorepo `pnpm@9.12.3` vacío — `apps/api/src` y `apps/web/src` sin código, `packages/shared/src/index.ts` con deuda hardcodeada (`MODELS`, `REWARD`, `LIMITS`), `docker-compose.yml` con `litellm:main-latest` y `litellm.yaml` estático, `package.json` root con 8 scripts pero sin `eslint`, `vitest`, `dependency-cruiser` ni gates 200-líneas configurados. No es repo git.

## Goal
Implementar end-to-end la vertical F1+F2 medible: `sesión flexiones → verificación server → crédito atómico → quote → débito → streaming vía LiteLLM pool múltiple (N Zen FREE + M Go + P Zen paid) → SSE con resume → métricas/margen` bajo arquitectura hexagonal DB-first, sin hardcode y con límite 200 líneas/archivo.

## Success Criteria
- `runtime_manifest` versionado desde Postgres sirve catálogo, precios, gateways, `api_routes`, `ui_navigation` y `design_tokens`; PWA y API no contienen fallback hardcodeado.
- Seeder idempotente transaccional pasa `migrar+seed+seed` en Postgres vacío y produce mismo manifest.
- `N+M+P` deployments en `credential_deployments` con `secret_ref` (nunca plaintext), balanceo LiteLLM por `model_name` lógico, `PoolController` corta al 80% por ventana Go (12/5h,30/sem,60/mes), retry solo pre-primer-token.
- Wallet/ledger: `balance>=0`, `SUM(ledger)=balance`, idempotencia, `UnitOfWork`, 200 concurrent earns/spends sin double-spend.
- SSE: `id/event/data`, heartbeat, `Last-Event-ID` resume desde Redis Stream con TTL 30-60m, sin reintento cambiando modelo post-primer-chunk.
- MediaPipe: cámara solo tras gesto usuario, calibración, histéresis, WebWorker/OffscreenCanvas, contador provisional hasta `VERIFIED`, privacidad (no upload video).
- `pnpm typecheck/lint/test/build/db:migrate/db:seed` + `check-file-lines<200` + `dependency-cruiser` hexagonales + `secret-scan` + contract tests verdes.
- Funnel, costo real por modelo/gateway y contribución con Go a $10/mes (no promo) medidos.

## Context And Current Facts
- **Estructura:** `pnpm-workspace.yaml` con `apps/*`,`packages/*` [verificado `ls -R`]. `apps/api/package.json` solo tiene `fastify, pg, ioredis, zod, nanoid` — faltan `bullmq, litellm client, opentelemetry, vitest, eslint`.
- **Deuda shared:** `MODELS` 16 modelos + `REWARD` + `LIMITS` hardcodeados [leído `packages/shared/src/index.ts:1-56`] — debe migrar a `model_catalog, reward_policies, pool_policies` + manifest.
- **Infra:** `docker-compose.yml:1-46` usa `pgvector/pg16`, `redis:7-alpine`, `ghcr.io/berriai/litellm:main-latest` + `OPENCODE_ZEN_API_KEY` única y `ZEN_FREE_KEYS,GO_TOKENS` vacías — viola regla 9 (pool múltiple real). Falta `LiteLlmConfigAdapter` generado.
- **Faltantes:** sin migraciones, sin `apps/api/src/*`, sin `apps/web/*`, sin `design-system`, sin `DynamicRouteRegistry`, sin ADR.
- **Plan Rev.6 exige:** FASE 0 gates G0.1-G0.10 cerrados antes de rollout público; hexagonal estricto; crédito ≠ USD; `litellm.yaml` generado; sponsors etiquetados; WCAG 2.2 AA.

## Constraints And Non-goals
- **Límites duros:** 200 líneas/archivo código versionado, 40 líneas/función, CC≤8, ≤4 params sin ADR; `domain` no importa Fastify/ORM/Redis/HTTP/TypeBox/SDK; `application` solo domain+ports.
- **No hardcode** de modelos/precios/gateways/protocolos/URLs/rutas/rewards/flags/copy/tokens en runtime.
- **Secrets** solo vía secret_ref/env injection, nunca en DB plaintext, repo, logs, bundle, source maps.
- **No ampliar** `litellm.yaml` estático ni `shared` constants.
- **No Python** en core F1.
- **Non-goals F1/F2:** OpenFusion, RAG/pgvector/HNSW, cache semántica, GPS/tesoros/Battle PvP/ligas, tools agentes, API pública terceros, venta/transferencia créditos.

## Key Decisions
| Decisión | Opción elegida | Alternativa rechazada | Por qué |
|---|---|---|---|
| DB-first manifest | Postgres `runtime_manifest` versionado + cache Redis + invalidación outbox | Env vars / JSON estático | Permite cambiar precio/ruta/gateway sin redeploy; exigido por AGENTS regla 4 |
| Routing pools | `PoolController` (elige deployments elegibles <80%) + LiteLLM balanceo nativo por `model_name` lógico | Router propio duplicando balanceo | Evita duplicar cooldown; respeta spec §6.6 |
| SSE resume | Redis Streams `chat:{run_id}:events` con `id` secuencial | Delegar a LiteLLM | LiteLLM no persiste tras desconexión navegador; resume propio requerido §10 |
| Wallet atomicidad | `UnitOfWork` + `CHECK balance>=0` + `UNIQUE(wallet_id,idempotency_key)` + `version` optimistic | RESERVE/SETTLE complejo | Suficiente para F1, evita complejidad §8; escalable a RESERVE si hace falta |
| Pose | `@mediapipe/tasks-vision PoseLandmarker VIDEO numPoses:1` en Web Worker, calibración por sesión, evidence mínima (features cuantizadas, no frames) | Enviar video al server | Privacidad §9 + costo; severidad fraude web documentada |
| Tokens UI | DTCG `primitive→semantic→component` en `design_tokens` → CSS variables vía adapter | Tailwind hardcode | WCAG/contrast validable, tematizable desde DB §6.4 |
| Versionado | `pnpm` + TS estricto, `eslint max-lines 200`, `dependency-cruiser`, `vitest`, `playwright`, `storybook a11y` | No gates | Sin gates no se cumple Definición de Terminado AGENTS |
| LiteLLM deploy | `LiteLlmConfigAdapter` genera `litellm.yaml` desde `provider_gateways/endpoints/model_catalog/credential_deployments` al boot + reconcile job | YAML manual | Elimina key única, fija versión (no `main-latest`) §6.6-7 |

## Recommended Approach
**FASE 0 primero (evidencia en Postgres/Redis/LiteLLM mocks, sin tocar promo real):** spike protocol por gateway (`/responses` vs `/messages` vs `/chat/completions`), simular scopes Go/Zen con headers fixtures, validar `N+M+P` autorizado en papel (G0.1-G0.4), fijar roles `provider`/`model` futuros.

**Luego vertical slice DB-first:** migraciones → seeder transaccional por bounded context (<200 líneas cada) → `runtime_manifest` → `DynamicRouteRegistry` + `CatalogRegistry/DesignTokenRegistry` → domain policies (Reward, Quota 75/80) → use-cases con `UnitOfWork` → adapters Postgres/Redis/LiteLLM/Provider Strategy → composition-root wiring → PWA `app/runtime/design-system/features/adapters` → observabilidad.

**Cada precio/ruta/token es fila DB;** `shared` queda solo con tipos/contratos, nunca constantes de negocio post-migración.

## Work Plan

### PR-1: Fundación monorepo + gates calidad
**Depende:** nada
- Inicializar git, `eslint` + `eslint-plugin-max-lines`, `dependency-cruiser`, `check-file-lines` (script poliglota), `tsconfig` strict, `vitest`, `playwright` esqueleto, `storybook` base.
- Pinnear `litellm` versión (ej. `ghcr.io/berriai/litellm:v1.52.0` con digest), crear `apps/api/litellm.yaml.example` (dummy), ajustar `compose.yml` healthchecks.
- `ADRs`: 001 hexagonal, 002 db-first manifest, 003 pools múltiples, 004 200-líneas, 005 node-ts boundary, 006 design-system.
- **Archivos:** `eslint.config.mjs`, `.dependency-cruiser.cjs`, `scripts/check-file-lines.mjs` (<200 líneas), `docs/adr/*`.

### PR-2: DB migraciones + runtime_manifest base
**Depende:** PR-1
- Tablas: `provider_gateways, provider_endpoints, model_catalog, credential_deployments, credential_usage_windows, pool_policies, api_routes, ui_navigation, design_tokens, feature_flags, outbox_events, seed_runs, users, wallets, ledger_entries, reward_policies, activity_sessions, chat_quotes, chat_runs, ad_events`.
- Índices, CHECKs (`balance>=0`), UNIQUEs (`wallet_id,idempotency_key`), enums.
- `config/RuntimeManifest.ts` + loader validado con Zod desde DB, cache Redis con `manifest_version`, evento outbox invalidación.
- **Valida** `DynamicRouteRegistry` puede cargar `api_routes` y rechazar `use_case_key` no registrado (sin `eval`).

### PR-3: Seeder idempotente convergente
**Depende:** PR-2
- `seed-runner.ts` (<200) + por contexto: `seed-gateways, seed-endpoints, seed-models, seed-pricing, seed-credentials, seed-routes, seed-policies, seed-design-tokens, seed-navigation, seed-feature-flags` — cada <200, IDs estables, `ON CONFLICT DO UPDATE`, FK ordenadas, transacción, auditoría `seed_runs` (checksum, manifest_version).
- Datos iniciales: `N=3 Zen FREE, M=3 Go, P=2 Zen paid` dummy `secret_ref`, pool `FREE {deepseek-v4-flash-free…big-pickle}`, `STANDARD Go {gpt-5.6-luna,kimi-k3,glm-5.2,deepseek-4-pro,qwen-3.8-max}`, `PREMIUM Zen {claude-*,gpt-5.6-terra/sol}`, `reward 500 créditos/rep, daily_cap 50`, créditos como `BIGINT` micros.
- **Migra** `MODELS/REWARD/LIMITS` de `shared` a DB; `shared` conserva solo tipos `Tier/Gateway/ModelId` derived del manifest.

### PR-4: Hexagonal core — domain + ports + use-cases wallet/ledger
**Depende:** PR-2
- `domain/entities`: `Wallet, LedgerEntry, ActivitySession, ChatQuote, ChatRun, CredentialDeployment`
- `domain/value-objects`: `Credits, QuotaScope, UsageWindow, ChallengeNonce`
- `domain/policies`: `RewardPolicy, DailyCapPolicy, QuotaPolicy (75/80 threshold DB), Specification {QuotaAvailable, ModelEnabled}`
- `application/ports/outbound`: `WalletRepository, LedgerRepository, CatalogPort, PoolPort, Clock, EventBus, UnitOfWork, SecretsPort`
- `application/use-cases`: `VerifyActivity, CreateQuote, CreateRun, RefundRun, GetCatalog, GetWallet` — cada ≤40 líneas orquestando domain+ports.
- Tests unitarios: reward, daily cap, debit atómico, idempotencia.

### PR-5: Adapters Postgres + Redis + UnitOfWork + Outbox
**Depende:** PR-4
- `infrastructure/adapters/postgres`: repositories + mappers (`Data Mapper`), `PgUnitOfWork`, `OutboxPostgresAdapter`.
- `infrastructure/adapters/redis`: `RedisStreamAdapter` (chunks SSE), rate-limit, cooldown, manifest cache.
- Concurrencia: test 500 workers sobre misma wallet con `pg` real.
- `composition-root` wiring inicial (sin HTTP aún).

### PR-6: Provider Strategy + PoolController + LiteLlmConfigAdapter
**Depende:** PR-3, PR-5
- `Strategy` por `protocol` (`responses/messages/chat_completions`), `GatewayAdapterFactory` (Abstract Factory), `ProviderPort` normalizado.
- `PoolController` lee `credential_usage_windows`, excluye `>=80%` o `cooldown_until>now()`, publica `eligible_deployments` a Redis; LiteLLM elige.
- `LiteLlmConfigAdapter` genera `litellm.yaml` desde `runtime_manifest` (un deployment por credencial/protocolo, `model_name` lógico compartido), reconcilia con restart controlado.
- Contract tests con upstream falso (fixtures por protocolo, 429 con `retry_after`, timeout, stream cortado) + LiteLLM con 2 deployments falsos.

### PR-7: HTTP — DynamicRouteRegistry + Fastify + SSE resume
**Depende:** PR-5, PR-6
- `infrastructure/http/DynamicRouteRegistry` valida método/path/schema/auth/use_case y registra en Fastify; health/readiness + `GET /runtime-manifest` bootstrap fijos.
- `SchemaRegistry` (Zod→JSON Schema), auth cookie `HttpOnly/Secure/SameSite`, RBAC admin, rate-limit por user/IP, payload limits.
- `ChatFacade` (Facade) `quote→run→stream`: `POST /quotes`, `POST /runs`, `GET /runs/:id/events` SSE con `id,event,data,heartbeat`, `Last-Event-ID` resume desde Redis Stream, worker `BullMQ` continúa tras disconnect.
- Tests integración: 429/503 con `retry_after`, quota 79/80/cooldown exhausted, disconnect antes/después primer token.

### PR-8: Worker + Observabilidad + Seguridad
**Depende:** PR-7
- `apps/worker` (o `infrastructure/worker` BullMQ adapter) invocando `application/ports/inbound`.
- Logs redactados, `otel` métricas: `llm_requests_total, ttft, credential_window_usage_pct, provider_429_total, wallet_conflict_total, reconciliation_mismatch`, funnel, alerts 75/80, backup/restore test.
- Fixes: `trustProxy` limitado, CORS same-origin, CSP, `Permissions-Policy: camera=(self)`, egress LiteLLM allowlist, secret-scan CI.

### PR-9: PWA — app/runtime/design-system/features
**Depende:** PR-2, PR-7
- `apps/web` Vite+React: `app/composition-root`, `runtime/{ApiPort,RouteResolver,CatalogRegistry,DesignTokenRegistry}`, `adapters/{http,sse,storage,camera}`.
- `design-system` headless/compound: `AppShell, CreditBalance, ActivityCard (12 estados), SponsorPlacement, PrimaryCTA, ProgressPath (proto), tokens DTCG → CSS variables desde manifest`, WCAG 2.2 AA, Storybook a11y.
- `features/activity`: `getUserMedia` solo tras click, carga WASM progresiva, PoseLandmarker Worker, calibración/histéresis, evidence mínima, detención tracks; `features/chat,wallet,catalog`.
- E2E Playwright: flexión→earn→FREE→STANDARD Go→PREMIUM Zen→resume→reconciliación, responsive 320/360/430, offline, saldo cero, cámara denegada.

### PR-10: Monetización + Simulador economía
**Depende:** PR-7, PR-9
- `SponsorPlacement` nativo, frecuencia limitada, consentimiento, `ad_events` (estimated vs finalized).
- Ruta admin `economy` + job diario: DAU, requests/DAU, tokens costo Zen real, uso Go 5h/sem/mes, OPEX promo vs renovación `M×5 / M×10`, infra, contribución, escenarios bajo/base/alto editables.
- Circuit breaker global y por scope; Prebid solo si uplift medido.

## Validation Plan
| Unidad | Comando / check | Evidencia esperada |
|---|---|---|
| PR-1 | `pnpm typecheck && pnpm lint && node scripts/check-file-lines.mjs` + `npx depcruise apps/api/src` | 0 archivos >200 líneas, 0 import domain→infra, `main-latest` eliminado |
| PR-2/3 | `pnpm db:migrate && pnpm db:seed && pnpm db:seed` + `SELECT * FROM seed_runs` + contract manifest | 2º seed idempotente, mismo `manifest_version`, checksum auditado |
| PR-4/5 | `pnpm test` (vitest unit + pg concurrency 500 workers + redis real) | `balance>=0`, `SUM=balance`, idempotency replay sin duplicado |
| PR-6 | `pnpm test -- pool && vitest contract/provider` con upstream falso | 3 protocolos non-stream+stream OK, `litellm.yaml` generado coincide DB |
| PR-7 | `curl -i /runtime-manifest`, `curl -N /runs/:id/events` con `Last-Event-ID`, `hey` 79/80% | Rutas DB-first, SSE resume sin texto repetido, 429 con `retry_after` |
| PR-8 | `pnpm test:security` + `gitleaks` + backup restore en compose | 0 secrets en bundle/logs, restore OK |
| PR-9 | `pnpm --filter web build && pnpm --filter web test` + Playwright + Storybook a11y + Lighthouse | 12 estados ActivityCard, focus/keyboard/screen-reader, 44px, reduced-motion |
| E2E | Playwright `activity→earn→quote→run→stream→refund` + chaos (kill api/worker/redis) | `PARTIAL/FAILED` + refund correcto, ledger reconciliado |
| Economía | `GET /admin/economy` simulador con `M=3` | `promo $15 vs renovación $30`, ventanas Go por scope, contribución |

**Riesgo mayor validado en PR-6/7:** Pool agota 80% → LiteLLM cooldown + SSE 429 controlado; si falla, todo FASE 3 (monetización) da margen falso.

## Risks / Rollback
| Riesgo | Trigger | Mitigación |
|---|---|---|
| G0.1 comercial no autorizado | Sin carta OpenCode | Mantener beta privada, no exponer gateway público; ADR |
| Scopes Go compartidos (capacidad no suma) | `credential_usage_windows` mismo `quota_scope_id` | Contar una cuota, alertar, reducir rollout; no evadir límites |
| Promo Go expira | `promo_ends_at` próximo | Decisiones ya con $10/mes; alerta 30 días antes |
| Modelo retirado | contract `/models` diff | `DRAINING→DISABLED`, bump `manifest_version` |
| Ledger mismatch | reconciliación ≠0 | Pausar `spend`, drenar `earn`, reparar append-only |
| Fraude pose web | falsos positivos >15% | Bajar `credits_per_rep`/caps, evaluar native attestation |
| VPS caída | healthcheck | Backup cifrado externo, restore test semanal, migrar a PG administrado |
| Fuga secreto | gitleaks | Revocar, rotar `secret_ref`, drenar deployment |

Rollback: cada PR es feature-flagged (`feature_flags` DB); migración reversible; `manifest_version` anterior restaura catálogo/rutas sin redeploy.

## Open Questions
1. ¿Carta OpenCode G0.1 y scopes reales Zen FREE/Go/paid por key? Bloquea pool size `N,M,P`.
2. ¿Países/edad mínima y red ads (GAM vs sponsor directo) para FASE 3? Define consentimiento.
3. ¿Nombre visual créditos y `credits_per_verified_rep` inicial (500?) + daily cap 50? Confirmar con UX.
4. ¿Versión exacta LiteLLM a pinnear y digest? Evitar `main-latest` ya.
5. ¿Tenant `users` auth: email+password vs magic link? Define `auth_policy_key`.
6. ¿Retención evidence pose y chunks SSE (30 vs 60m) y política borrado cuenta? Legal.

---
*No se inicia código hasta aprobación. Tras aprobar, ejecutar PR-1→PR-10 en orden; cada PR se publica como diff/commit separado.*
