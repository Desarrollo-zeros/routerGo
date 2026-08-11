# ADR-002: DB-first runtime_manifest

Estado: Aceptado 2026-08-10

## Contexto
Modelos, precios, gateways, rutas, tokens y navegación no pueden hardcodearse en runtime. Variables env solo para secretos.

## Decisión
Postgres es fuente de verdad. Tablas `provider_gateways`, `provider_endpoints`, `model_catalog`, `api_routes`, `ui_navigation`, `design_tokens`, `feature_flags` generan `runtime_manifest` versionado. Fastify registra rutas vía `DynamicRouteRegistry`. PWA consume manifest en bootstrap; no hay fallback hardcodeado.

## Alternativas
- Config en YAML versionado: requiere redeploy para cambiar precio.
- Env vars: viola regla 3 AGENTS.

## Validación
Seed idempotente 2× en PG vacío produce mismo manifest. Test altera fila + bump version → API/UI cambian sin recompilar. Registry rechaza `use_case_key` no registrado (no eval/import dinámico).

## Rollback
Mantener manifest cacheado previo; revertir migración si loader falla cerrado.
