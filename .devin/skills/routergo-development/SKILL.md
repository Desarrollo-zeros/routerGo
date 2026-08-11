---
name: routergo-development
description: Desarrollar y revisar RouterGo respetando arquitectura hexagonal, SOLID, DB-first, pools múltiples y límite estricto de 200 líneas
argument-hint: "[tarea]"
triggers:
  - user
  - model
---

# Skill RouterGo Development

Aplica este skill para cualquier cambio de RouterGo. Lee primero `AGENTS.md` y `.agents/plans/2026-08-09-esfuerzo-tokens.md`. No asumas que el plan refleja el filesystem: verifica archivos, dependencias y scripts.

## Prioridades no negociables

1. API hexagonal Ports & Adapters.
2. SOLID y bounded contexts claros.
3. Máximo 200 líneas físicas por archivo de código, incluyendo tests y scripts.
4. Máximo 40 líneas por función, complejidad 8 y 4 parámetros.
5. Cero hardcode de modelos, precios, gateways, protocolos, URLs, rutas, rewards, límites, copy, navegación o design tokens en runtime.
6. PostgreSQL + `runtime_manifest` es la fuente de configuración.
7. Seeder inicial idempotente y repetible.
8. Pools múltiples `N` Zen FREE + `M` Go + `P` Zen paid; nunca una key global única.
9. No usar credenciales no autorizadas ni evadir límites del proveedor.
10. No mezclar Node/TS y Python dentro del mismo bounded context.

## Primer diagnóstico

- Ejecuta búsqueda de archivos y contenido antes de editar.
- Comprueba `package.json`, workspace, compose, env example, migraciones, seeds y plan.
- Identifica deuda existente. En el estado inicial conocido, `packages/shared/src/index.ts` contiene `MODELS`, `REWARD` y `LIMITS` hardcodeados: cualquier tarea que lo toque debe planear su migración a DB/seed/manifest.
- El compose inicial usa config estática de LiteLLM, variables de key única y una imagen `main-latest`; no agregues más catálogo allí. Planifica `LiteLlmConfigAdapter` generado desde DB y versiones fijadas.
- Si no hay código para una pieza, no inventes su ubicación: propone la estructura hexagonal y registra el gap.

## Arquitectura obligatoria

```text
apps/api/src/
  composition-root/
  domain/
  application/ports/{inbound,outbound}/
  application/use-cases/
  infrastructure/adapters/{postgres,redis,litellm,providers}/
  infrastructure/http/
  infrastructure/worker/
  config/

apps/web/src/
  app/
  design-system/
  features/
  runtime/
  adapters/
```

- `domain` solo contiene reglas puras, entities, value objects, policies y domain events.
- `application` orquesta casos de uso mediante ports; no conoce SQL, Fastify, Redis ni SDKs.
- `infrastructure` implementa ports.
- `composition-root` inyecta adapters y es el único punto de wiring.
- Fastify, worker y tests son inbound adapters. Postgres, Redis, LiteLLM, provider y secrets son outbound adapters.
- UI features consumen `ApiPort`, `RouteResolver`, `CatalogRegistry` y `DesignTokenRegistry`; nunca hacen fetch directo ni importan paths.

## DB-first

Cuando una tarea agrega o cambia un modelo, precio, gateway, protocolo, límite, ruta o UI:

1. Añade o actualiza migración.
2. Añade datos declarativos al seed del bounded context correspondiente.
3. Usa IDs estables, foreign keys en orden, transacción y upsert convergente.
4. Actualiza `runtime_manifest` y su versión.
5. Expón los datos por el adapter API correspondiente.
6. Invalida cache mediante evento/outbox.
7. Añade contract tests para API y frontend.

Tablas relevantes: `provider_gateways`, `provider_endpoints`, `model_catalog`, `credential_deployments`, `credential_usage_windows`, `pool_policies`, `api_routes`, `ui_navigation`, `design_tokens`, `feature_flags`, `outbox_events` y `seed_runs`.

Las rutas de producto vienen de `api_routes` y se registran con `DynamicRouteRegistry`. La DB solo selecciona keys registradas en un registry tipado. Nunca ejecutar `eval`, `Function`, `import()` arbitrario, SQL dinámico ni un `use_case_key` desconocido. Health/readiness y bootstrap del manifest son las únicas rutas de infraestructura fija.

## Seeder

El seeder debe estar dividido en archivos menores de 200 líneas:

```text
seed-runner
seed-gateways
seed-endpoints
seed-models
seed-pricing
seed-credentials
seed-routes
seed-policies
seed-design-tokens
seed-navigation
```

- No insertar secretos ni API keys; solo `secret_ref`, deployment metadata y quota scope.
- Crear filas para todos los pools múltiples: Zen FREE, Go y Zen paid.
- Ejecutar migraciones + seed dos veces y verificar el mismo manifest.
- No borrar ni revocar datos automáticamente.
- Registrar checksum, versión, actor y resultado en `seed_runs`.

## Pools OpenCode

- `N` Zen FREE, `M` Go y `P` Zen paid son deployments independientes en DB.
- El routing selecciona `deployment_id` elegible; nunca una constante `API_KEY` única.
- LiteLLM balancea deployments del mismo modelo lógico; `PoolController` aplica scopes, cooldowns y policy de capacidad.
- El costo Go se calcula como `M × USD 5` el primer mes y `M × USD 10` en renovación.
- Los límites Go son por scope real y deben medirse: USD 12/5 h, USD 30/semana y USD 60/mes según la documentación actual.
- Si las credenciales comparten cuota, el simulador cuenta una sola cuota. No crear cuentas, usar proxies ni generar tráfico para eludir límites.
- Retry solo antes del primer evento de streaming. No cambiar silenciosamente de modelo después de emitir tokens.
- Secrets solo desde secret manager/env injection; nunca en DB plaintext, código, logs, bundle o source map.

## Patrones autorizados

Usa el patrón solo si resuelve un problema y deja prueba:

- Hexagonal / Ports & Adapters: aislamiento del dominio.
- Strategy: protocolo/provider seleccionado por registro DB.
- Data Mapper: filas DB a entidades.
- Abstract Factory: adapter por gateway/deployment.
- Repository: persistencia por aggregate.
- Unit of Work: wallet, ledger y transacciones atómicas.
- Specification: elegibilidad de model/deployment/quote.
- Decorator: rate limit, cooldown y breaker.
- Facade: quote → run → stream.
- State: sesiones de actividad/chat.
- Domain Events + Outbox: métricas y jobs confiables.
- Registry/Runtime Manifest: configuración mutable y rutas DB-first.
- Headless/Compound Components: design system reutilizable.
- Adapter/View Model: API runtime y UI.

No crear `GodService`, `GenericRepository`, controllers gordos ni jerarquías vacías. Los patrones adicionales requieren ADR con alternativas, impacto SOLID, pruebas y rollback.

## UI y diseño

- Las imágenes son inspiración visual, no datos de producto.
- Usa marca propia, tokens DTCG `primitive → semantic → component` y CSS variables provenientes del manifest.
- Un CTA primario por pantalla; créditos siempre etiquetados y costo antes de gastar.
- `ActivityCard` debe cubrir permisos, carga, calibración, activo, pausa, envío, verificación, aprobado, rechazado y no disponible.
- Sponsors etiquetados, separados del reward y sin inducir clics.
- Storybook/A11y, Playwright, contraste, focus-visible, teclado, lector de pantalla, responsive y reduced motion.
- Kage inspira capas/navegación; Gradient Studio inspira tokens/proceduralidad; TanStack Charts se usa solo detrás de `ChartPort` y con versión estable; Anatomy inspira separación app/db/worker. No introducir Three.js en F1.

## Calidad y verificación

Antes de terminar:

1. Ejecuta `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` si existen.
2. Ejecuta migración y seed dos veces en Postgres vacío.
3. Ejecuta `check-file-lines` para todo código versionado.
4. Ejecuta dependency-cruiser para imports TypeScript y import-linter si existe bounded context Python.
5. Ejecuta tests de contrato contra Postgres, Redis y upstream falso; no consumas promociones para pruebas de carga.
6. Prueba concurrencia de wallet/ledger, idempotencia, pool al 79/80%, cooldown, 429 y streaming resume.
7. Revisa bundle/source maps/logs por modelos, precios, URLs, rutas o secrets indebidos.
8. Comprueba que cambiar una fila de DB y `manifest_version` actualiza API/UI sin recompilar.
9. Revisa diff y no hagas commit/push salvo solicitud explícita.

Si una verificación no puede ejecutarse porque todavía no existe, informa el gap y añade el trabajo necesario; no declares la tarea completa.
