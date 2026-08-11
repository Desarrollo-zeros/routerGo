# RouterGo — reglas de agentes y desarrollo

## Fuente de verdad

- La especificación funcional y técnica es `.agents/plans/2026-08-09-esfuerzo-tokens.md`.
- Esta guía es obligatoria para cualquier cambio de código, infraestructura, UI, datos o documentación técnica.
- Si el plan y el código discrepan, no se oculta la discrepancia: se documenta, se crea un ADR y se corrige el plan o la implementación antes de continuar.
- El skill reutilizable del proyecto está en `.devin/skills/routergo-development/SKILL.md`.

## Estado actual conocido

- Monorepo `pnpm` con `apps/*` y `packages/*`.
- La API es Node/TypeScript/Fastify; F1 no incorpora Python al mismo bounded context.
- Scripts actuales del root: `dev`, `build`, `typecheck`, `lint`, `test`, `db:migrate` y `db:seed`.
- `packages/shared/src/index.ts` contiene actualmente modelos, gateways, rewards y límites hardcodeados. Es deuda conocida y debe migrarse a DB/seeder/runtime manifest antes de declarar FASE 1 completa.
- El compose actual tiene un `litellm.yaml` estático, variables de key única y una imagen `main-latest`. No se debe ampliar ese enfoque; debe migrarse a configuración generada desde DB, pools múltiples y versiones fijadas.
- No asumir que existe UI, API, migración, seed o test solo porque aparece en el plan: comprobar el filesystem.

## Reglas de oro

1. Ningún archivo de código versionado supera 200 líneas físicas: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.py`, scripts, tests y SQL ejecutable. El límite también aplica a código generado si se versiona.
2. Ninguna función o método supera 40 líneas, complejidad ciclomática 8 o 4 parámetros sin ADR aprobado. Extraer policies, value objects, mappers, repositories o adapters.
3. No hardcodear modelos, precios, proveedores, gateways, protocolos, URLs, paths de negocio, rutas, límites, rewards, feature flags, copy, navegación ni design tokens en runtime.
4. La fuente de configuración es PostgreSQL mediante `runtime_manifest` versionado. Variables de entorno se reservan para secretos y configuración mínima de infraestructura.
5. Las rutas de producto se registran desde `api_routes` mediante `DynamicRouteRegistry`. Solo health/readiness y bootstrap del manifest son infraestructura fija.
6. Una fila DB nunca ejecuta `eval`, `Function`, `import()` arbitrario, SQL dinámico ni símbolos no registrados. `use_case_key`, `schema_key` y mapper keys deben pertenecer a registries tipados.
7. El seeder inicial es obligatorio, idempotente, transaccional, auditable y convergente. Debe llenar gateways, endpoints, modelos, precios, pools, policies, rutas, navegación, design tokens y flags.
8. No guardar API keys en DB, código, logs, bundles, source maps o `litellm.yaml` versionado. DB almacena `secret_ref`, `deployment_id`, `quota_scope_id` y metadatos.
9. El pool es múltiple: `N` Zen FREE + `M` Go + `P` Zen paid. No existe una key global única. `P >= 2` es el objetivo de producción pública; cualquier restricción del proveedor se valida antes del lanzamiento.
10. Solo se usan credenciales obtenidas y autorizadas por el operador. No crear cuentas no autorizadas, evadir cuotas, rotar IPs/proxies para eludir límites ni exponer el gateway a terceros sin autorización comercial.

## Arquitectura hexagonal

```text
composition-root
  ├── inbound adapters: Fastify, worker, tests
  ├── application: use cases + inbound/outbound ports
  ├── domain: entities, value objects, policies, events
  └── outbound adapters: Postgres, Redis, LiteLLM, provider, secrets
```

- `domain` no importa Fastify, ORM, Redis, HTTP, JSON Schema/TypeBox ni SDKs.
- `application` solo conoce domain y ports; nunca SQL, HTTP ni framework.
- `infrastructure` implementa ports y traduce tecnologías.
- `composition-root` es el único lugar que construye adapters e inyecta dependencias.
- Controllers, handlers y workers solo validan/mapean y llaman ports inbound; no contienen reglas de negocio.
- La UI mantiene `app`, `runtime`, `design-system`, `features` y `adapters` separados. Features no importan transporte; design-system no importa features.
- Los bounded contexts no se mezclan. Python solo puede entrar como servicio aislado detrás de un port y con ADR.

## SOLID y patrones

- S: un use case, repository, mapper, policy y adapter tiene una razón de cambio.
- O: nuevos modelos/gateways/configuración se agregan mediante DB, seed y adapters compatibles sin modificar el dominio.
- L: Postgres/InMemory, Zen/Go y adapters de test cumplen los mismos ports y contratos.
- I: ports pequeños para wallet, catálogo, usage, provider, stream, clock, secrets, transacciones y eventos.
- D: casos de uso dependen de abstracciones; adapters concretos solo se conectan en composition-root.

Patrones aprobados por defecto: Hexagonal, Strategy, Data Mapper, Abstract Factory, Repository, Unit of Work, Specification, Decorator, Facade, State, Domain Events + Outbox, Registry/Runtime Manifest, Headless/Compound Components y Adapter/View Model. Cada patrón adicional requiere ADR, prueba y motivo concreto. No crear `GodService`, `GenericRepository` ni jerarquías vacías.

## DB-first y seeder

- Configuración mínima: `provider_gateways`, `provider_endpoints`, `model_catalog`, `credential_deployments`, `credential_usage_windows`, `pool_policies`, `api_routes`, `ui_navigation`, `design_tokens`, `feature_flags`, `outbox_events` y `seed_runs`.
- El frontend obtiene catálogo, precios, capabilities, navegación, rutas y tokens desde el manifest de la API.
- Los modelos visibles en el plan son filas iniciales del seeder, no constantes para importar desde `shared`.
- Cada seed de bounded context debe ser menor de 200 líneas, usar IDs estables, FK ordenadas, `upsert`/`ON CONFLICT` y no borrar filas.
- Ejecutar migraciones + seed dos veces en Postgres vacío y comparar el manifest resultante.
- Cambios de configuración requieren nueva versión del manifest, invalidación de cache y contract tests.

## Diseño UI

- Las imágenes de `img/` son referencias, no requisitos funcionales ni fuente de cifras, marcas o copy.
- Usar marca propia, tema oscuro accesible, tokens DTCG `primitive → semantic → component` y CSS variables generadas desde el manifest.
- Un CTA primario por pantalla; saldo siempre etiquetado como créditos; precio y disponibilidad antes del gasto.
- `ActivityCard` debe cubrir idle, permission, loading, calibration, ready, active, paused, submitted, verifying, verified, rejected y unavailable.
- Sponsors siempre etiquetados, separados del reward y sin inducir clics.
- WCAG 2.2 AA: contraste, focus-visible, teclado, lector de pantalla, targets de 44 px, reduced motion y no depender solo del color.
- Storybook/A11y y Playwright deben probar estados, responsive, errores, saldo cero, cámara denegada y ausencia de fill.
- Kage, Gradient Studio, TanStack Charts y Anatomy son referencias de composición, tokens, charts desacoplados y organización; no introducir Three.js/WebGL en F1.

## Flujo de trabajo

1. Leer este archivo, el skill del proyecto y el plan relevante antes de editar.
2. Verificar filesystem, dependencias y estado real; nunca inventar archivos o scripts.
3. Para tareas no triviales, usar una lista de tareas y mantener un solo paso en progreso.
4. Clasificar el cambio en bounded context y definir port, use case, adapter, migración y seed antes de implementar.
5. Si cambia configuración, añadir migración/seed y actualizar runtime manifest; nunca duplicar el valor en `shared` o UI.
6. Si cambia un provider, usar Strategy/Factory, actualizar contract tests y mantener todos los pools múltiples.
7. Si cambia wallet o ledger, usar Unit of Work, idempotencia, constraint de saldo y prueba concurrente.
8. Ejecutar typecheck, lint, tests, seed repetido, arquitectura/import checks y límite de líneas antes de finalizar.
9. Revisar diff, secretos, dependencias y archivos >200 líneas. No hacer commit ni push salvo solicitud explícita.

## Verificación esperada

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:migrate
pnpm db:seed
```

Los comandos anteriores son los scripts declarados actualmente; si alguno todavía no está implementado, el trabajo debe dejarlo registrado como gap y añadir el gate correspondiente. Para desarrollo local, `docker compose` se usa solo con credenciales dummy y nunca para publicar servicios sin TLS, auth y secrets reales.

## Definición de terminado

- Todos los archivos de código cumplen el límite de 200 líneas.
- Imports respetan el hexágono y SOLID.
- No hay modelos, precios, gateways, rutas o paths de negocio hardcodeados en runtime.
- Seeder idempotente llena la DB y el manifest sirve la configuración a API/UI.
- `N + M + P` deployments están representados como pool; no se cae a una key única.
- Tests unitarios, contract, integración, concurrencia, seguridad y UI pasan.
- No se exponen secretos ni datos sensibles.
- El plan y los ADRs reflejan la implementación real.
