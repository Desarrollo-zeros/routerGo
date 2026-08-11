# Plan: Esfuerzo → Tokens — Rev.6 MVP medible (pool múltiple Zen + Go)

**Fecha:** 2026-08-09  
**Slug:** `esfuerzo-tokens`  
**Estado:** Revisado; listo para ejecutar cuando se cierren los gates de FASE 0  
**Reemplaza:** Rev.5  
**Fuentes verificadas:** [OpenCode Go](https://opencode.ai/docs/go/) · [OpenCode Zen](https://opencode.ai/docs/zen/) · [Términos OpenCode](https://opencode.ai/legal/terms-of-service) · [LiteLLM load balancing](https://docs.litellm.ai/docs/proxy/load_balancing) · [MediaPipe Pose Web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js) · [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) · [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) · [Política de anuncios con recompensa de GAM](https://support.google.com/admanager/answer/7496282?hl=en)

**Referencias de diseño investigadas:** [Kage](https://github.com/MengTo/kage) · [Gradient Studio](https://gradientsaas.blogspot.com/) · [TanStack Charts](https://tanstack.com/charts/latest/docs/overview) · [Anatomy](https://github.com/thebuggeddev/anatomy) · [Design Tokens Community Group](https://www.w3.org/community/design-tokens/) · [Storybook accessibility](https://storybook.js.org/docs/writing-tests/accessibility-testing) · [ESLint max-lines](https://eslint.org/docs/latest/rules/max-lines) · [Ruff](https://docs.astral.sh/ruff/)

> **Decisión protegida por solicitud del producto:** esta revisión conserva el uso de **múltiples API keys de Zen FREE** y **múltiples tokens/suscripciones de Go**, incluida la promoción de **USD 5 el primer mes por suscripción**. No se reduce el pool a una sola credencial. La arquitectura solo usará credenciales adquiridas y autorizadas por el operador; FASE 0 debe confirmar por escrito el uso comercial y el alcance real de cuotas/promociones antes de abrir el producto al público.

---

## 1. Resumen ejecutivo

Construir una PWA mobile-first donde el usuario gana créditos virtuales mediante esfuerzo verificable y los usa dentro de la app para acceder a modelos LLM. El usuario no compra créditos, no paga suscripción y no puede transferirlos ni convertirlos en dinero. Los costos del operador se financian con publicidad y patrocinios.

El MVP valida una sola vertical completa:

```text
sesión de flexiones → verificación → crédito atómico → selección de modelo →
quote de créditos → respuesta en streaming → débito/refund → medición de margen
```

La ruta de inferencia será:

```text
PWA → Fastify → LiteLLM → OpenCode Zen/Go
```

La Rev.6 corrige cinco problemas de la Rev.5:

1. Go no es ilimitado: cuesta USD 5 el primer mes y USD 10 después por suscripción, con límites de USD 12/5 h, USD 30/semana y USD 60/mes.
2. Las bases y protocolos varían por gateway y modelo; Go usa `https://opencode.ai/zen/go/v1`.
3. Los créditos de la app no equivalen a dólares ni a tokens de entrada/salida del LLM.
4. Un ledger `earn/spend` puede ser simple, pero debe ser transaccional, idempotente y seguro ante concurrencia desde F1.
5. La economía de 10k DAU era una hipótesis no validada. La escala se decidirá con costos y revenue reales, usando el precio de renovación de Go, no la promoción.

---

## 2. Objetivo, principios y alcance

### Objetivo de producto

- FREE es la entrada por defecto, incluso con saldo cero.
- STANDARD y PREMIUM se pagan únicamente con créditos ganados por esfuerzo.
- El operador paga Zen/Go; no existe checkout, Stripe, compra de créditos ni suscripción del usuario.
- La actividad inicial es flexiones detectadas en el dispositivo con MediaPipe.
- Los anuncios financian el servicio, pero no sustituyen el esfuerzo ni condicionan la entrega de créditos ya ganados.

### Principios invariables

1. **Pool múltiple preservado:** `N` credenciales Zen FREE + `M` tokens/suscripciones Go + `P` credenciales Zen pay-as-you-go; no existe una key global única.
2. **Sin secretos en el cliente:** la PWA nunca recibe keys, tokens, aliases internos ni errores crudos del proveedor.
3. **Créditos no monetarios:** son enteros virtuales, no “tokens LLM”, dinero, cripto ni derechos sobre una cantidad fija de cómputo.
4. **Privacidad por defecto:** no se sube ni persiste video; no se guardan prompts completos en logs.
5. **Proveedor reemplazable, producto estable:** el catálogo público usa IDs lógicos; los IDs, precios y protocolos del proveedor viven en un manifiesto versionado.
6. **No prometer ausencia de límites:** la UI muestra disponibilidad, costos en créditos y ventanas de restablecimiento reales.
7. **No escalar con subsidios temporales:** el caso de negocio se aprueba con Go a USD 10/mes por suscripción.

### Fuera de alcance del MVP

- OpenFusion, ensembles, debate y cascade.
- RAG, pgvector, HNSW y cache semántica.
- Cache global de conversaciones o respuestas privadas.
- GPS running, tesoros, geofences, Google Fit y sensores de movimiento.
- Modo batalla, PvP, ligas, amigos y mapa completo de cursos.
- Herramientas del agente, ejecución de código, navegación web, archivos o imágenes en prompts.
- API pública para terceros; el endpoint compatible con OpenAI es interno a la PWA autenticada.
- Venta, transferencia, retiro o monetización de créditos por el usuario.

---

## 3. Hallazgos de las imágenes

Las seis imágenes de `img/` son **referencias visuales**, no requisitos ni evidencia de reglas, cifras, marcas, recompensas o monetización.

| Archivo | Patrón visual aprovechable | Lo que no se adopta |
|---|---|---|
| `261eafa4-34e5-43e5-83d6-81bd0f88eeaa.jpg` | Jerarquía mobile-first, sponsor destacado, tarjeta de ejercicio y CTA fijo | Marca, copia, 1.000 tokens, balance y sponsor ficticio |
| `35000db5-72f0-4d60-9e0a-0aad9830e1d3.jpg` | Flujo vertical claro: actividad → sponsor → balance → CTA | Promesa “sin esperas/sin límites” y datos mostrados |
| `3528239b-5d4b-49bb-a532-1a47f9b631d5.jpg` | Sponsor horizontal compacto, acceso a historial y alta legibilidad del balance | Equivalencia fija entre repeticiones y cifra visual |
| `4311d071-c4fb-40e9-ab9a-bb359d3db562.jpg` | Tarjeta integrada, estados de disponibilidad y beneficios resumidos | Claims premium y productos ficticios |
| `87fa9f2e-9846-4d08-b953-ed6048679fb3.jpg` | Selector de formato y resumen de estadísticas para un futuro modo batalla | PvP en MVP y estadísticas de ejemplo |
| `e8558e61-1130-42ba-86ae-5914beb86295.jpg` | Mapa de progreso, nodos bloqueados y navegación inferior | Curso Java, XP y contenido de ejemplo |

### Decisión de diseño

- Crear un único sistema de componentes, no seis pantallas independientes: `AppShell`, `CreditBalance`, `ActivityCard`, `ActivityState`, `SponsorPlacement`, `PrimaryCTA`, `ProgressPath` y `BattleFormatSelector`.
- F1 implementa solo `AppShell`, `CreditBalance`, `ActivityCard`, estados de cámara y CTA.
- `ProgressPath` y `BattleFormatSelector` quedan como prototipos de F3.
- Usar marca propia. No reutilizar nombres, logos, sponsors, personajes, claims ni cifras de las ilustraciones.
- Cumplir WCAG 2.2 AA: contraste, foco visible, targets de 44 px, texto escalable, lectores de pantalla, reduced motion y estado no dependiente solo del color.

### Reglas de diseño

Estas reglas son la fuente de verdad para el sistema visual. Las imágenes solo inspiran la dirección; no se copian literalmente ni definen cifras, marcas o comportamiento.

#### Identidad visual

- Usar una marca propia y verificable; no usar “Claude Code”, logos de Anthropic/OpenCode, personajes, sponsors o iconografía reconocible de las referencias.
- Dirección visual: oscura, energética y tecnológica, con profundidad mediante superficies y bordes sutiles, no mediante saturación excesiva.
- Tokens visuales iniciales, sujetos a contraste automatizado: `color.bg`, `color.surface`, `color.surface-muted`, `color.brand`, `color.brand-soft`, `color.success`, `color.warning`, `color.danger`, `color.text-primary`, `color.text-secondary` y `color.text-disabled`.
- No usar gradientes, brillos, sombras o partículas como decoración obligatoria. Deben tener una alternativa estática y respetar `prefers-reduced-motion`.
- Tipografía sans-serif legible, dos pesos principales y una escala limitada. Reservar tipografía monoespaciada para números técnicos, IDs o estadísticas.
- El contraste se valida sobre el color final de la superficie, incluyendo imágenes, overlays y estados deshabilitados.

#### Layout y responsive

- Diseñar primero para ancho móvil de 360 px; validar 320 px, 375–430 px, tablet y desktop.
- Usar áreas seguras de iOS/Android y no colocar CTA, contadores o controles debajo de la zona de cámara/notch.
- Mantener un grid de espaciado consistente basado en múltiplos de 4 px; no ajustar cada pantalla con valores aislados.
- Una sola columna en móvil, ancho legible en desktop y márgenes fluidos.
- La información crítica aparece antes del primer scroll: actividad actual, estado de cámara, saldo disponible y siguiente acción.
- No fijar un CTA si tapa contenido, teclado, controles del navegador o aviso de patrocinio.
- Las imágenes decorativas deben tener `object-fit` y `object-position` definidos, `alt` correcto o `aria-hidden` si no aportan información.

#### Jerarquía y composición

- Cada pantalla tiene un único CTA primario. Acciones secundarias son enlaces, botones outline o controles de menor peso.
- La tarjeta de actividad sigue este orden: tipo de actividad → instrucción breve → estado/contador → evidencia o progreso → acción.
- El saldo siempre muestra etiqueta y contexto: “créditos disponibles”, “ganados en esta sesión” o “costo estimado”. Nunca mostrar una cifra aislada que parezca tokens del proveedor o dinero.
- El costo de un modelo se muestra antes de gastar: modelo, tier, créditos requeridos y disponibilidad aproximada.
- Sponsor y producto se separan visualmente de la recompensa. La tarjeta patrocinada no puede parecer una validación del ejercicio ni un botón para recibir créditos.
- No mostrar simultáneamente varios banners, badges, modales o llamadas urgentes en el primer viewport.
- El contenido dinámico debe reservar espacio para evitar saltos de layout, especialmente el contador, saldo y anuncios.

#### Estados obligatorios de `ActivityCard`

Toda actividad debe diseñarse y probarse en estos estados:

1. `idle`: explicación y CTA para comenzar.
2. `permission`: motivo del permiso y ayuda si el usuario lo rechaza.
3. `loading_model`: progreso del modelo local, sin duración prometida.
4. `calibration`: encuadre, iluminación y postura; todavía no se acreditan repeticiones.
5. `ready`: condiciones válidas, CTA para iniciar.
6. `active`: contador provisional, pausa, detener y feedback de calidad.
7. `paused`: motivo, reanudar o finalizar sin perder control.
8. `submitted`: evidencia enviada, sin modificar el contador.
9. `verifying`: explicación de que el servidor decide.
10. `verified`: repeticiones aceptadas, créditos acreditados y acceso claro al chat.
11. `rejected`: motivo comprensible, opción de reintentar y nunca prometer crédito.
12. `unavailable`: cámara, modelo, gateway o cuota no disponibles; ofrecer FREE o reintento seguro.

#### Interacción, feedback y copy

- Todos los controles deben tener estados `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading` y `error`.
- No usar un spinner indefinido sin texto; indicar qué está cargando, verificando o esperando.
- El contador durante la actividad es provisional hasta la respuesta `VERIFIED` del servidor.
- Los errores deben decir qué pasó, qué no se perdió y qué puede hacer el usuario; nunca exponer stack traces, keys o detalles internos.
- Evitar claims absolutos como “sin límites”, “instantáneo”, “100% verificado” o “siempre disponible”.
- Usar lenguaje consistente: `créditos` para la moneda interna, `tokens de entrada/salida` solo para métricas LLM y `costo en créditos` para el gasto del usuario.
- Copys de promoción, precio, disponibilidad y reward se renderizan desde configuración; no se incrustan en imágenes ni se hardcodean como hechos permanentes.
- La primera acción de cámara explica privacidad, no enviar video y la alternativa de continuar con FREE sin ejercicio.

#### Sponsor, publicidad y accesibilidad

- Todo anuncio se etiqueta visiblemente como `Patrocinado` o `Publicidad`.
- El placement no imita un botón del producto, contador, mensaje de éxito o CTA primario. No induce clic accidental.
- No condicionar el crédito verificado a ver, tocar o hacer clic en un anuncio.
- Respetar consentimiento, edad, región, frecuencia máxima y opción de cierre de la red publicitaria.
- Si no hay fill, conservar espacio estable u ocultarlo sin mover el CTA; no mostrar sponsors ficticios.
- Cada estado tiene texto accesible; el contador y el resultado usan `aria-live` sin anunciar cada frame.
- El foco sigue el flujo visual y no queda atrapado detrás de cámara o publicidad.
- No depender solo de colores: combinar icono, texto y patrón.
- Targets táctiles mínimos de 44 × 44 px; probar zoom, fuente grande, teclado, lector de pantalla, daltonismo y reduced motion.
- Las animaciones son cortas, no bloquean navegación y tienen fallback estático.

#### Reglas de diseño QA

Antes de aceptar una pantalla, verificar capturas en 320/360/430 px, safe areas, contraste, focus visible, lector de pantalla, estado offline, carga lenta, error de proveedor, ausencia de fill, saldo cero, saldo insuficiente, cámara denegada y `prefers-reduced-motion`. Una pantalla no está terminada si solo funciona en el estado feliz de la ilustración.

### Investigación aplicada de diseño y UI

Las referencias se usan como principios, no como dependencias ni copias:

| Referencia | Principio aplicable | Límite de adopción |
|---|---|---|
| Kage | Escenas por capítulos, profundidad por capas, navegación clara, responsive y reduced motion | No introducir Three.js/WebGL en F1; no bloquear el flujo de cámara ni rendimiento móvil |
| Gradient Studio | Gradientes procedurales, paletas bloqueables, historial y exportación de tokens | Los valores finales salen de `design_tokens`/manifest; no CSS arbitrario por pantalla |
| TanStack Charts | Gramática declarativa tipada, renderer desacoplado, SVG accesible y responsive | Usar adapter; la rama principal es pre-alpha, por lo que se fija una versión estable o se pospone |
| Anatomy | Separación limpia de `app`, `db`, `worker`, migraciones y seed reproducible | La interacción 3D queda fuera de F1; se adopta organización, no la complejidad visual |

Skills/tooling que se deberán evaluar y fijar en FASE 0:

- **Design tokens:** formato DTCG con capas primitive → semantic → component; DB/seed como fuente runtime y adapter a CSS variables.
- **Design system:** componentes headless/compound con estados explícitos; Storybook como catálogo ejecutable de estados.
- **A11y:** Storybook A11y/Axe, Playwright y revisión manual con teclado/lector de pantalla; CI bloquea violaciones críticas.
- **Charts:** `ChartPort` propio; TanStack Charts solo detrás del adapter y con versión estable fijada.
- **Node/TypeScript:** Fastify schema-based validation, TypeScript estricto, ESLint, Vitest, Playwright, dependency-cruiser y OpenTelemetry según necesidad.
- **Python:** Ruff, mypy, pytest, Hypothesis e import-linter solo si se aprueba un bounded context Python. F1 no mezcla Python con el core Node/TS.
- Ninguna skill, librería, patrón o dependencia se incorpora por nombre de moda: debe tener ADR, versión fijada, prueba de integración y cumplir el límite de 200 líneas.

---

## 4. Gates que bloquean el lanzamiento público

FASE 0 no es opcional. Ningún cálculo de margen ni rollout público es válido hasta cerrar estos gates.

| Gate | Evidencia requerida | Condición de salida |
|---|---|---|
| G0.1 Uso comercial | Confirmación escrita de OpenCode sobre servir Zen/Go dentro de una app para usuarios finales | Uso permitido y restricciones archivadas |
| G0.2 Pool Zen FREE | Dos o más credenciales autorizadas; observar headers/dashboard sin forzar abuso | Se conoce si la cuota es por key, cuenta, workspace o IP |
| G0.3 Pool Go | `M` tokens/suscripciones autorizadas | Se confirma si límites y promoción son independientes o compartidos |
| G0.4 Pool Zen paid | `P` credenciales autorizadas | El routing puede usar un pool múltiple; no existe una key paid global única |
| G0.5 Protocolos | Contract test de un modelo por `/responses`, `/messages` y `/chat/completions` en Zen y Go | Non-stream y stream devuelven formato y usage esperado |
| G0.6 Costos | Factura/dashboard contra telemetría de llamadas controladas | Error de estimación de costo <10% o tarifa fija conservadora |
| G0.7 Monetización | Elegibilidad real de GAM/red elegida o sponsor directo | Se conoce fill, eCPM, revenue finalizado y restricciones |
| G0.8 Pose | Prueba en dispositivos objetivo, iluminación y posiciones diversas | Tasa de conteo y UX aceptables para beta cerrada |
| G0.9 Arquitectura | Tests de imports, SOLID, límite de líneas y separación de adapters | Hexágono sin dependencias invertidas; todos los archivos bajo 200 líneas |
| G0.10 DB-first/seeder | Postgres vacío + migraciones + seeder repetido + contract tests de manifest/rutas | Catálogo, precios, gateways, pools, rutas y UI salen de DB |

El uso frecuente de credenciales Zen/Go se analizará mediante dashboards, headers, scopes y telemetría controlada para aprovechar de forma autorizada los recursos del pool múltiple sin alcanzar ni evadir límites.

Los términos publicados por OpenCode con vigencia 2026-03-06 describen uso interno y no en beneficio de terceros. No se debe interpretar una key funcional como autorización comercial. Si G0.1 no se cierra, se puede continuar con prototipo privado, pero no abrir el gateway a usuarios finales.

El test de pools no creará cuentas no autorizadas, usará proxies para eludir límites ni llevará credenciales al 100%. Si varias credenciales comparten scope, el simulador contabiliza una sola cuota.

---

## 5. Criterios de éxito del MVP

### Funcionales

- Una sesión de flexiones pasa por `CREATED → CALIBRATING → ACTIVE → SUBMITTED → VERIFIED|REJECTED`.
- Una prueba verificada genera exactamente una entrada `earn`; repetir el mismo `Idempotency-Key` devuelve el resultado original sin duplicar saldo.
- FREE funciona con saldo cero y tiene límites por usuario para proteger el pool compartido.
- STANDARD/PREMIUM muestran un quote de créditos antes de ejecutar; el débito es atómico y nunca deja saldo negativo.
- Si el proveedor falla antes del primer token, se crea un `refund` idempotente. Si hubo salida parcial, se conserva el cargo fijo informado.
- Cada evento SSE tiene `id`; una reconexión continúa desde `Last-Event-ID` sin repetir texto.
- El usuario nunca puede seleccionar deployment, gateway, credencial o modelo fuera del catálogo habilitado.
- Una instalación limpia obtiene catálogo, precios, gateways visibles, navegación y paths de negocio desde el `runtime_manifest` de la API; el bundle no contiene una lista de fallback.

### Técnicos

- Cero keys/tokens en bundle, HTML, source maps, logs, trazas o respuestas.
- Prueba concurrente sobre una wallet no produce double-spend ni `balance < 0`.
- Retry de proveedor solo antes del primer byte y con la misma familia/modelo lógico; nunca se cambia silenciosamente de modelo a mitad del stream.
- Los límites de 5 h, semana y mes de Go se cortan al 80% configurable por cada scope confirmado.
- La API devuelve `429`/`503` controlado con `retry_after` cuando no hay capacidad; no promete “nunca 429”.
- El video permanece en memoria local y se detienen sus tracks al terminar, cancelar, ocultar la app o perder permiso.
- Backup de Postgres restaurado con éxito en entorno de prueba.

### Producto y economía

- Se mide el funnel completo: visita → permiso → calibración → sesión iniciada → sesión verificada → primer chat → segundo chat.
- Se separan revenue estimado y finalizado; las decisiones usan revenue finalizado.
- Se conoce el costo real por request/modelo/gateway y la capacidad consumida de cada ventana Go.
- El rollout no depende del precio promocional: la contribución debe ser positiva usando `M × USD 10/mes` y costos reales de Zen, infraestructura y operación.
- La recompensa por repetición y los precios en créditos se pueden cambiar por configuración versionada sin reescribir el ledger histórico.

---

## 6. Arquitectura recomendada — Hexagonal (Ports & Adapters) sin arroz con mango

### 6.0 Diagrama físico

```text
[ PWA React + Vite ]
        |
        | HTTPS, cookie de sesión, SSE
        v
[ Fastify API ] --------------------------> [ Postgres ]
        | auth, catálogo, quote, wallet,        fuente de verdad
        | actividad, policy, rate limits
        |
        +------> [ Redis ]
        |        colas, rate limits, chunks SSE TTL, estado efímero
        |
        +------> [ Worker ] ------> [ LiteLLM ] ------> [ Zen / Go ]
                                   router nativo          pools múltiples (N Zen FREE + M Go + P Zen paid)
```

### 6.1 Hexágono: qué va dentro de Fastify API

Todo lo que está dentro de `apps/api` es **hexagonal puro**. Afuera solo hay adapters. Nada de lógica en controllers.

```text
apps/api/src/
├── composition-root/       # Único lugar que crea y conecta adapters con ports
│   ├── bootstrap/          # Arranque, migraciones, seed/check y manifest reload
│   └── registry/            # Registry tipado de use-case keys, policies y adapters
├── domain/                 # Núcleo puro, 0 dependencias de framework/DB
│   ├── entities/           # Wallet, LedgerEntry, ActivitySession, ChatQuote, ChatRun, CredentialDeployment
│   ├── value-objects/      # Credits, ModelId, QuotaScope, UsageWindow, ChallengeNonce
│   ├── policies/           # RewardPolicy, DailyCapPolicy, QuotaPolicy (threshold DB)
│   └── events/             # ActivityVerified, CreditsEarned, QuoteCreated
├── application/            # Casos de uso y puertos
│   ├── ports/
│   │   ├── inbound/        # Contratos de entrada para API, worker y tests
│   │   └── outbound/       # Repositories, UnitOfWork, Catalog, Pool, Clock, EventBus
│   ├── use-cases/          # Orquestan domain + ports, sin SQL/HTTP/framework
│   ├── services/            # Servicios pequeños por bounded context
│   └── dto/                # Contratos de entrada/salida, nunca entidades ORM
├── infrastructure/
│   ├── adapters/
│   │   ├── postgres/       # Repositories, UnitOfWork, config reader y seed runner
│   │   ├── redis/          # Streams, rate limit, cooldown e invalidación
│   │   ├── litellm/        # Router/stream adapter
│   │   └── providers/      # Adapters según gateway y protocolo de DB
│   ├── http/               # DynamicRouteRegistry + Fastify adapter, sin lógica de negocio
│   └── worker/             # BullMQ adapter que invoca puertos inbound
├── config/                 # Loader/validator de runtime-manifest desde DB
└── shared/                 # Tipos pequeños y errores compartidos, sin dependencias inversas

apps/web/src/
├── app/                    # composition root de UI y runtime manifest
├── design-system/          # tokens, headless/compound components y stories
├── features/               # activity, chat, wallet; cada feature aislada
├── runtime/                # ApiPort, RouteResolver, CatalogRegistry, DesignTokenRegistry
└── adapters/               # browser camera, SSE, storage y transport HTTP
```

**Regla de dependencias:** `domain` no importa nada de `application` ni `infrastructure`. `application` solo conoce `domain` + `ports`. `infrastructure` implementa `ports`. `http/worker` solo inyectan adapters.

### 6.2 Reglas de oro — no negociables (evitan arroz con mango)

1. **Máximo 200 líneas físicas por archivo de código.** Aplica a `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.py`, `.sql` ejecutable, scripts y tests. También aplica a código generado si se versiona; preferir no versionar artefactos generados. El CI falla con `max-lines: 200` y el script poliglota `check-file-lines`. Ninguna excepción por archivo “especial”.
2. **Funciones pequeñas.** Máximo 40 líneas por función/método, complejidad ciclomática máxima 8 y máximo 4 parámetros. Si una unidad crece, extraer un caso de uso, policy, value object, mapper o adapter. No ocultar líneas con minificación.
3. **Cero hardcode de negocio o integración.** Modelos, nombres de proveedor, precios, protocolos, URLs/base paths, límites, thresholds, reward, daily caps, feature flags, copy, navegación y rutas de negocio vienen de Postgres mediante `runtime_manifest`. Variables de entorno solo contienen secretos y configuración de infraestructura necesaria para arrancar (`DATABASE_URL`, secret-store reference, bind address).
4. **Pool múltiple real, nunca single.** `N` Zen FREE + `M` Go + `P` Zen paid son pools de `credential_deployments`; `P >= 2` para producción pública. Cada fila referencia `secret_ref`, `quota_scope_id`, gateway, protocolo y estado. El código selecciona deployments elegibles por datos; nunca selecciona “key 2” ni usa una key global.
5. **DB como fuente de verdad, código como intérprete.** Cambiar un precio, modelo, gateway, ruta, token visual o política es una migración/seed o `UPDATE` transaccional más `manifest_version`; no requiere modificar TypeScript/Python ni redeployar la aplicación.
6. **Seeder obligatorio y convergente.** Después de migraciones se ejecuta un seeder idempotente, transaccional y ordenado por FK. Usa IDs estables y `upsert`; no inserta secretos, usuarios reales ni datos temporales. El seeder inicial crea gateways, endpoints, modelos, precios, pools, scopes, rutas, policies, design tokens, navegación y feature flags.
7. **Rutas de negocio DB-first y seguras.** `api_routes` define método, path, versión, `use_case_key`, auth policy, schema key y estado. `DynamicRouteRegistry` carga y valida esas filas al arrancar o al cambiar el manifest, y conecta `use_case_key` únicamente con un registry tipado en código. La DB nunca puede ejecutar imports, SQL, JavaScript, Python ni funciones arbitrarias. Solo health/readiness y el endpoint de bootstrap del manifest son infraestructura fija.
8. **Un caso de uso = una transacción cuando muta estado.** `VerifyActivity`, `CreateQuote`, `CreateRun`, `RefundRun` y `SeedReferenceData` usan `UnitOfWork`; wallet y ledger se confirman juntos. Nunca actualizar wallet y luego insertar ledger fuera de una transacción.
9. **Dependencias hacia dentro.** `domain` no importa framework, ORM, Redis, HTTP, JSON Schema/TypeBox ni SDKs. `application` solo importa `domain` y ports. `infrastructure` implementa ports. `http`, `worker` y `composition-root` son adapters/composición. Ningún adapter se importa desde `domain` o `application`. En web, `design-system` no importa features; `features` no importan transporte; `runtime/adapters` se inyectan desde `app`.
10. **SOLID verificable.** Cada módulo tiene una razón de cambio; nuevos gateways/modelos se agregan mediante datos y adapters sin modificar el dominio; cada adapter cumple el contrato de su port; ports son estrechos; la composición inyecta dependencias. Violaciones bloquean CI o requieren ADR aprobado.
11. **No mezclar Node, TypeScript y Python en un mismo bounded context.** F1 usa Node/TypeScript para API, worker y UI. Python solo se añade como servicio aislado detrás de un port si existe una necesidad demostrada; no se duplica lógica entre lenguajes.
12. **No patrón por moda.** Cada patrón debe resolver un problema concreto, tener prueba y aparecer en un ADR. Si una función simple satisface el port, no se crea una jerarquía de clases.

#### Contrato SOLID verificable

| Principio | Aplicación en RouterGo | Prueba/gate |
|---|---|---|
| **S — Single Responsibility** | Un use case orquesta un flujo; un repository persiste un aggregate; un mapper transforma; un adapter traduce una tecnología | Revisión de responsabilidades y archivos bajo 200 líneas |
| **O — Open/Closed** | Añadir gateway, protocolo, modelo, policy o tema se hace con filas DB + adapter/registry compatible; no se modifica el dominio central | Contract test de un deployment nuevo sin tocar policies de wallet |
| **L — Liskov Substitution** | Postgres/InMemory, Zen/Go y adapters de test cumplen exactamente el port, errores y garantías de entrega | Suite de contratos ejecutada contra cada implementación |
| **I — Interface Segregation** | Ports separados para catálogo, wallet, usage, provider, stream, clock, transactions y secrets; ningún `GodPort` | Dependency-cruiser detecta imports cruzados y revisión de interfaces |
| **D — Dependency Inversion** | Casos de uso dependen de ports; adapters concretos se inyectan solo en `composition-root` | Test de imports: domain/application no importan Fastify, ORM, Redis ni SDKs |

Violaciones SOLID, un `GodService`, un `GenericRepository`, un controller con reglas de negocio o un adapter usado directamente por otro adapter bloquean merge.

### 6.3 Patrones de diseño aplicados (skill design / design-patterns)

| Problema | Patrón | Dónde vive | Regla de uso |
|---|---|---|---|
| Separar dominio de Fastify, DB y proveedores | **Hexagonal / Ports & Adapters** | `domain`, `application/ports`, `infrastructure/adapters` | El core solo conoce contratos de negocio; todos los efectos externos entran por ports. |
| Seleccionar protocolo por registro DB | **Strategy** (`ProtocolStrategy`) | `infrastructure/providers` | `model_catalog.protocol` selecciona una strategy registrada; no hay `if` por nombre de modelo en casos de uso. |
| Convertir filas DB a entidades | **Data Mapper** | `infrastructure/adapters/postgres/mappers` | Las entidades no reciben objetos ORM ni conocen columnas, JSON o SQL. |
| Crear adapters por gateway/deployment | **Abstract Factory** (`GatewayAdapterFactory`) | `composition-root` + infrastructure | Construye adapters desde `provider_gateways` y `provider_endpoints`; valida que el registro exista. |
| Persistencia intercambiable | **Repository + Port** | `application/ports/outbound` → adapters | Cada repository atiende un aggregate/bounded context; no existe `GenericRepository` universal. |
| Wallet y ledger atómicos | **Unit of Work** | `application/ports/outbound` + Postgres adapter | Agrupa cambios relacionados y controla commit/rollback/retry de concurrencia. |
| Elegibilidad de deployment y quote | **Specification** | `domain/policies` | Combina `QuotaAvailable`, `ModelEnabled`, `TierAllowed` y `BudgetAvailable` sin SQL ni HTTP. |
| Rate limit y breaker | **Decorator** | `application/decorators` | Añade capacidad operativa a un port sin contaminar la policy de negocio. |
| Orquestar quote→run→stream | **Facade** (`ChatFacade`) | `application/use-cases` | El adapter HTTP invoca una operación; no conoce pasos internos ni deployments. |
| Estados de actividad/chat | **State** mediante reducer/transiciones | `domain/policies` | Transiciones explícitas; estados inválidos se rechazan, no se resuelven con booleanos dispersos. |
| Eventos confiables | **Domain Events + Outbox** | `domain/events`, `outbox` port y Postgres adapter | Ledger confirma primero; métricas/colas consumen eventos después sin perderlos. |
| Configuración mutable | **Registry + Runtime Manifest** | `config`, `DynamicRouteRegistry`, `CatalogRegistry` | DB define datos; código solo valida keys y contratos permitidos. |
| Componentes visuales | **Headless/Compound Components** | `apps/web/design-system` | Estado y accesibilidad viven en componentes reutilizables; la pantalla compone, no duplica estilos. |
| Cliente API y rutas UI | **Adapter + View Model** | `apps/web/api`, `apps/web/runtime-manifest` | La PWA consume manifest DB/API; no importa URLs ni catálogo desde cada componente. |
| Gráficos administrativos | **Declarative Grammar Adapter** | `apps/web/admin/charts` | Encapsula TanStack Charts detrás de un port; el dominio entrega series tipadas y el renderer es sustituible. |

Si un patrón no está en esta tabla, no se introduce sin ADR. Strategy, Factory, Repository o Facade no justifican archivos grandes ni abstracciones vacías.

ADRs iniciales obligatorios: `ADR-001-hexagonal`, `ADR-002-db-first-runtime-manifest`, `ADR-003-multiple-credential-pools`, `ADR-004-file-size-boundary`, `ADR-005-node-ts-language-boundary`, `ADR-006-ui-design-system`. Cada ADR registra contexto, alternativas rechazadas, impacto en SOLID, pruebas y criterio de rollback.

### 6.4 Contrato DB-first y runtime manifest

La aplicación arranca leyendo un `runtime_manifest` versionado desde Postgres. El manifest se valida con schemas, se guarda en cache con `manifest_version` y se invalida mediante evento/outbox. Si el manifest no es válido, el proceso falla cerrado y no sirve tráfico de negocio.

Tablas mínimas de configuración:

```text
provider_gateways(
  id, key, display_name, kind, auth_scheme, enabled, manifest_version
)

provider_endpoints(
  id, gateway_id, protocol, base_url, path_template,
  request_mapper_key, response_mapper_key, enabled
)

model_catalog(
  logical_id, provider_model_id, gateway_id, endpoint_id, tier,
  credit_price, limits_json, capabilities_json, enabled, version
)

api_routes(
  route_key, method, path_template, version, use_case_key,
  auth_policy_key, request_schema_key, response_schema_key,
  enabled, version
)

ui_navigation(
  route_key, screen_key, label_key, icon_key, order_index,
  required_capability, feature_flag, enabled
)

design_tokens(
  theme, token_key, token_type, token_value, contrast_pair,
  mode, version, enabled
)

feature_flags(
  key, default_value, rollout_json, starts_at, ends_at, enabled
)
```

Reglas del registro:

- El seeder crea todos los registros de referencia iniciales; el runtime no depende de constantes duplicadas en `.ts`, `.tsx` o `.py`.
- `use_case_key`, `request_schema_key`, `response_schema_key`, `request_mapper_key` y `response_mapper_key` solo pueden apuntar a registros tipados previamente publicados por el `composition-root`. No se ejecutan nombres provenientes de DB con `eval`, `import()`, `Function`, reflexión libre o SQL dinámico.
- `DynamicRouteRegistry` registra las rutas DB-first en Fastify después de validar método, path, schema, auth policy y use-case key. Detecta colisiones, paths ambiguos, métodos duplicados y namespaces reservados. Un cambio de ruta requiere nueva versión del manifest, prueba de contrato y reload controlado; si Fastify no puede desmontar de forma segura, se hace restart/rolling deploy, nunca registro parcial.
- Health/readiness y el endpoint mínimo que entrega el manifest son endpoints de infraestructura; las rutas de producto, navegación, modelos, precios, gateways y features vienen de DB.
- La PWA solicita `runtime-manifest` al arrancar y construye navegación, links, catálogo y tokens CSS desde esa respuesta. No contiene una lista alternativa de modelos/precios/URLs.
- `provider_endpoints` contiene bases y paths; `credential_deployments` referencia el gateway y el `secret_ref`. La app no conoce `zen/v1`, `zen/go/v1` ni una key concreta.
- Las design tokens siguen tres niveles: primitives, semantic y component. La DB/seed entrega el documento; un adapter lo convierte en CSS variables. Ningún componente usa colores o spacing literales.

### 6.5 Seeder inicial, idempotente y auditable

El seeder es parte del producto, no un script desechable:

```text
apps/api/src/infrastructure/adapters/postgres/seed/
├── seed-runner.ts
├── seed-gateways.ts
├── seed-endpoints.ts
├── seed-models.ts
├── seed-pricing.ts
├── seed-credentials.ts
├── seed-routes.ts
├── seed-policies.ts
├── seed-design-tokens.ts
└── seed-navigation.ts
```

- Cada archivo permanece por debajo de 200 líneas y contiene únicamente el bounded context que conoce.
- `seed-runner` ejecuta migraciones pendientes, verifica prerequisitos y corre todos los seeds en una transacción cuando el entorno lo permite.
- Seeds usan IDs estables, foreign keys en orden y `upsert`/`ON CONFLICT DO UPDATE` para converger al estado declarado; ejecutarlos dos veces produce el mismo estado.
- El seeder no borra filas, revoca credenciales ni sobrescribe secrets; las eliminaciones requieren migración/operación explícita y aprobación.
- Nunca se almacenan valores de API key. `seed-credentials` registra `secret_ref`, `quota_scope_id`, pool kind y metadata suministrada por un onboarding seguro.
- La configuración inicial contiene `N` Zen FREE, `M` Go y `P` Zen paid como pools separados; no se crea una única fila global de key.
- `seed_version`, checksum, actor, timestamp y `manifest_version` quedan auditados en `seed_runs`.
- CI levanta Postgres vacío, ejecuta migraciones + seeder dos veces y verifica catálogo, rutas, policies, tokens, permisos, pools y constraints.

### 6.6 Responsabilidades (misma infraestructura, con hexagonal explícito)

**PWA**
- UX, cámara, MediaPipe, generación de evidencia y consumo de SSE.
- Historial local por defecto; sincronización de conversaciones queda fuera de F1.

**Fastify (http adapter)**
- Autenticación, autorización, validación/serialización JSON Schema o TypeBox desde `SchemaRegistry`, y mapeo a `application/ports/inbound`. Sin lógica de negocio.
- No decide manualmente “key 2 vs key 3”.

**PoolController (application policy, no duplicado de LiteLLM)**
- Implementa `CredentialPoolPort`: lee `credential_usage_windows`, excluye `usage >=80%` o `cooldown_until > now()`, y publica `deployments_elegibles` a Redis para que LiteLLM elija por `model_name` lógico.
- Traduce ventanas económicas del proveedor (USD 12/5h, 30/sem, 60/mes) a estado binario `elegible/no elegible`.
- No replica balanceo; no expone aliases al cliente.

**LiteLLM**
- Un deployment por cada credencial/protocolo y un `model_name` lógico compartido para balancear entre los pools múltiples Zen FREE, Go y Zen paid.
- `LiteLlmConfigAdapter` genera/reconcilia la configuración desde `runtime_manifest`, `provider_endpoints`, `model_catalog` y `credential_deployments`; no existe un `litellm.yaml` con catálogo manual en el repositorio.
- Load balancing, cooldown, retries pre-stream y normalización de protocolos (`/responses` vs `/messages` vs `/chat/completions`) vía Strategy.
- Redis compartido para estado de routing si hay múltiples réplicas.
- Versiones fijadas; nunca usar tags o dependencias `latest`.

**Postgres**
- Única fuente de verdad de wallet, ledger, catálogo, jobs, uso consolidado y economía. Todo lo configurable vive aquí.

**Redis**
- Estado descartable. Una pérdida de Redis puede afectar resume/rate limiting temporal, pero nunca reconstruir ni alterar saldos.

### 6.7 Despliegue

- Una VPS es aceptable solo para prototipo y beta cerrada.
- Contenedores: reverse proxy/TLS, web estática, API, worker, LiteLLM, Postgres y Redis.
- Backups cifrados de Postgres fuera de la VPS, prueba periódica de restore, healthchecks, límites CPU/RAM, reinicio controlado y logs con retención.
- Antes de tráfico público relevante: Postgres administrado o aislado, al menos dos réplicas de API/worker y rolling deploy.

---

## 7. Integración OpenCode y pool múltiple

### Hechos verificados al 2026-08-09

- Go: USD 5 el primer mes y USD 10/mes después, por suscripción.
- Go: límites documentados de USD 12 por 5 horas, USD 30 por semana y USD 60 por mes.
- Solo un miembro por workspace puede suscribirse a Go; la validez de múltiples suscripciones del operador se resuelve en G0.3.
- Base Go: `https://opencode.ai/zen/go/v1`.
- Base Zen: `https://opencode.ai/zen/v1`.
- GPT usa `/responses`, Claude usa `/messages` y otros modelos pueden usar `/messages` o `/chat/completions`; el protocolo se configura por modelo, no por su nombre comercial.
- La lista de modelos puede cambiar.

### Pools preservados

```text
ZEN_FREE_KEYS = N credenciales autorizadas
GO_TOKENS     = M tokens/suscripciones autorizadas
ZEN_PAID_KEYS = P credenciales pay-as-you-go
```

- El costo Go es `M × USD 5` el primer mes y `M × USD 10` desde la renovación.
- La capacidad teórica es `M × {12/5h, 30/semana, 60/mes}` únicamente si G0.3 demuestra scopes independientes.
- Si varias keys comparten quota scope, permanecen en el pool para rotación/operación, pero la capacidad se contabiliza una sola vez por scope.
- Para Zen FREE no se inventan límites como “60 rpm/1.000 día”; se cargan valores observados o headers reales y se actualizan sin deploy.

### Routing y límites

1. Fastify resuelve el modelo lógico permitido y el tier del usuario.
2. PoolController excluye deployments en cooldown, deshabilitados o con cualquier ventana aplicable ≥80%.
3. LiteLLM selecciona entre deployments elegibles del mismo modelo lógico.
4. Un `429` actualiza `retry_after`/cooldown según headers; no se asume que siempre son 60 segundos.
5. Solo se reintenta antes de emitir el primer evento al usuario.
6. Con el pool agotado se devuelve disponibilidad y reset; FREE puede ofrecer otro modelo solo con consentimiento visible.
7. PREMIUM Zen tiene breaker diario y mensual. Go también tiene breaker para impedir top-ups o consumo fuera de presupuesto.

### Catálogo inicial candidato

El catálogo se habilita solo después de contract tests. La tabla siguiente representa filas de `seed-models`/`model_catalog`, no constantes embebidas en runtime ni una lista que la PWA pueda importar directamente:

| Tier | Gateway | Candidatos | Política |
|---|---|---|---|
| FREE | Zen FREE pool | `deepseek-v4-flash-free`, `mimo-v2.5-free`, `laguna-s-2.1-free`, `ling-3.0-tiny-free`, `longcat-2.0-free`, `north-mini-code-free`, `nemotron-3-ultra-free`, `big-pickle` | Saldo cero; cuota por usuario |
| STANDARD económico | Go pool | `deepseek-v4-flash`, `mimo-v2.5`, `gpt-5.6-luna`, `minimax-m3`, `qwen3.7-plus` | Priorizar capacidad y costo sombra |
| STANDARD avanzado | Go pool | `glm-5.2`, `kimi-k3`, `qwen3.8-max`, `deepseek-v4-pro` | Mayor precio en créditos y límites más estrictos |
| PREMIUM | Zen paid | `claude-sonnet-5`, `claude-opus-5`, `claude-fable-5`, `gpt-5.6-terra`, `gpt-5.6-sol` | Quote por modelo y breaker de USD |

Un job diario consulta el endpoint de catálogo definido en `provider_endpoints` y lo compara con el manifiesto aprobado. Modelos nuevos no se publican automáticamente; modelos retirados pasan a `DRAINING` y luego `DISABLED`.

### Gestión de secretos

- Las credenciales viven en un secret store o variables inyectadas al contenedor; la DB guarda `secret_ref`, alias opaco y metadatos, nunca plaintext.
- El `litellm.yaml` se genera en despliegue desde referencias de secretos y no se versiona con valores reales.
- Logger y tracing redactan `authorization`, cookies, keys, prompts y respuestas.
- El panel admin muestra solo `deployment_id` opaco y porcentajes, nunca prefijos/sufijos de la key.
- Rotación: añadir deployment nuevo, comprobar health, drenar el anterior y revocarlo.

---

## 8. Créditos, wallet y ledger

### Semántica

- Nombre interno: `credits` o `credit_micros`; nombre visual por definir con UX.
- No usar “1 crédito = USD X”. El costo monetario pertenece al operador y cambia por modelo/proveedor.
- `credits_per_verified_rep` comienza como hipótesis configurable, por ejemplo 500, no como promesa irreversible.
- El límite diario también es configuración versionada; 50 repeticiones puede ser el punto de partida de beta.
- Se elimina el cooldown arbitrario de 5 horas entre sesiones de esfuerzo. Las 5 horas son una ventana de cuota de Go, no una regla de ejercicio.

### Earning

```text
activity VERIFIED
→ transacción Postgres
→ INSERT ledger earn con UNIQUE(wallet_id, idempotency_key)
→ UPDATE wallet balance/lifetime
→ COMMIT
```

El cliente nunca envía el reward efectivo. Envía evidencia; el servidor toma `reward_policy_version` y calcula el crédito.

### Spending sin RESERVE/SETTLE complejo

1. El inbound port `CreateQuote` recibe modelo y límites de salida desde la ruta DB registrada.
2. Devuelve `quote_id`, `credit_cost`, `max_output_tokens` y `expires_at`.
3. El inbound port `CreateRun` consume el quote y hace un débito fijo en una transacción atómica.
4. La actualización usa `balance >= credit_cost` y bloqueo/versión; si no afecta una fila, responde saldo insuficiente.
5. Un fallo antes del primer token genera `refund`; una salida parcial conserva el cargo informado.
6. La medición `provider_cost_usd` se registra en `chat_runs`, separada del ledger del usuario.

No se necesita RESERVE/SETTLE en F1, pero sí transacciones, constraints, idempotencia y reconciliación diaria.

### Invariantes

- `wallet.balance >= 0` con constraint de DB.
- `SUM(ledger.amount_signed) == wallet.balance` tras reconciliación.
- Una idempotency key solo puede reutilizarse con el mismo hash de request.
- `earn`, `spend` y `refund` son append-only; no se editan filas históricas.
- `ad_revenue` y `sponsor_revenue` no entran al ledger del usuario.

---

## 9. Verificador de flexiones

### UX y estado

1. Explicar por qué se requiere cámara antes de abrir el prompt del navegador.
2. Solicitar `getUserMedia({video, audio:false})` únicamente tras acción del usuario y sobre HTTPS.
3. Cargar WASM/modelo de forma progresiva y versionada desde el mismo origen.
4. Calibrar encuadre, lado dominante, rango superior/inferior y luz.
5. Mostrar esqueleto/feedback local, contador provisional y pausa.
6. Enviar evidencia al finalizar; el servidor confirma o rechaza y solo entonces acredita.
7. Detener todos los tracks y limpiar buffers.

### Implementación

- `@mediapipe/tasks-vision` `PoseLandmarker`, `runningMode: VIDEO`, `numPoses: 1`.
- Inferencia en Web Worker/OffscreenCanvas cuando sea compatible; fallback adaptativo sin bloquear la UI.
- No prometer 30 fps. Objetivo: frecuencia adaptativa suficiente para contar, medida por dispositivo.
- Elegir el brazo con mejor visibilidad; no exigir ambos codos en una toma lateral.
- Calibrar umbrales por sesión y usar histéresis, suavizado y tiempo monotónico.
- Filtros: visibilidad, amplitud relativa, estabilidad de hombro/cadera, duración mínima/máxima y secuencia completa abajo→arriba.
- El modelo, thresholds y política llevan versión para reproducir decisiones.

### Evidencia mínima

```text
session_id, challenge_nonce, sequence_no, monotonic_timestamps,
features cuantizadas de landmarks relevantes, ángulos, visibilidad,
duración, reps_detectadas, model_version, policy_version, install_id rotatorio
```

- Muestrear features a una frecuencia reducida; no enviar frames ni imagen.
- El servidor valida nonce, orden, duración, hash duplicado, límites físicos y consistencia.
- Retener features de disputa por un plazo corto configurable y después borrarlas; conservar hash y resultado agregado.

### Límite honesto del antifraude

Una PWA no puede demostrar que un cliente modificado ejecutó MediaPipe ni que la cámara fue real. Nonce, secuencia y heurísticas frenan replay y fraude básico, pero no fabricación deliberada. No llamar al sistema “100% verificado” ni usar fingerprinting invasivo. Si el fraude supera el presupuesto, los pasos son bajar caps/riesgo y evaluar una app nativa con attestation; no acumular heurísticas falsas en web.

### Seguridad física y accesibilidad

- Aviso breve: superficie estable, espacio libre, detenerse ante dolor o mareo.
- No dar consejos médicos ni usar pose para diagnóstico.
- Mantener FREE disponible para quien no pueda o no quiera usar cámara.
- Una actividad adaptada puede añadirse tras validar la vertical, pero no se simula como verificada en F1.

---

## 10. Chat, streaming y resume

### API interna DB-first

La PWA no contiene una lista de paths. Consume el route manifest entregado por el endpoint de bootstrap de infraestructura y resuelve cada operación por `route_key`:

```text
runtime_manifest.routes[] = {
  route_key,
  method,
  path_template,
  version,
  request_schema_key,
  response_schema_key,
  auth_policy_key,
  use_case_key,
  enabled
}
```

El backend registra los paths declarados en `api_routes` mediante `DynamicRouteRegistry`. El cliente usa un `ApiPort` y un `RouteResolver`; ningún componente concatena URLs ni decide rutas. El endpoint de bootstrap es infraestructura; todas las rutas de modelos, wallet, chat, actividades, admin y navegación son filas seedadas en DB.

- La PWA usa cookie HttpOnly/Secure/SameSite y mismo origen.
- No se entregan keys virtuales de LiteLLM al navegador.
- Payload limitado por mensajes, bytes, input estimado, `max_output_tokens`, concurrencia y requests/día.
- Sin `tools`, URLs remotas, attachments ni system prompt arbitrario en F1.

### Flujo de chat

```text
auth → catálogo/tier → quote válido → débito atómico → crear chat_run →
worker → PoolController/LiteLLM → proveedor → chunks Redis → SSE → usage/costo
```

### Resume propio, no delegado a LiteLLM

- El inbound port `CreateRun` devuelve `run_id` y la URL de eventos resuelta desde el runtime manifest.
- El worker continúa la llamada aunque el navegador desconecte.
- Cada chunk se guarda en Redis Stream `chat:{run_id}:events` con secuencia y TTL de 30–60 minutos.
- SSE emite `id`, `event` y `data`, heartbeats y `Cache-Control: no-cache`.
- Al reconectar, `Last-Event-ID` reenvía solo eventos posteriores.
- El reverse proxy desactiva buffering y usa HTTP/2.
- Si el proceso muere antes del primer token, el run pasa a `FAILED` y se reembolsa; si hubo salida parcial, queda `PARTIAL`.
- No se reintenta con otro modelo/credencial después del primer chunk.

### Cache

No hay cache de respuesta de aplicación en F1. La Rev.5 asumía 5–15% de hits sin baseline y podía mezclar privacidad, parámetros y versiones.

F2 puede probar cache exacta solo si datos reales muestran repetición útil:

- Scope por usuario o contenido público curado; nunca cache global de conversaciones privadas.
- Solo requests deterministas sin tools/attachments.
- Key incluye modelo lógico, deployment version, system prompt, mensajes, parámetros y policy version.
- TTL corto, invalidación por catálogo y exclusión explícita de contenido sensible.
- La activación requiere ahorro medible mayor que costo/riesgo; HNSW no se deriva automáticamente de un hit rate bajo.

---

## 11. Monetización y economía

### Publicidad y sponsors

- Los créditos se ganan por esfuerzo. El anuncio financia al operador; no es requisito para recibir un crédito ya ganado.
- En MVP: sponsor/native card en un corte natural y frecuencia limitada por sesión/día.
- No incentivar clics ni presentar el CTA del sponsor como parte del ejercicio.
- Si se evalúa rewarded video en el futuro, debe ser opt-in, descartable y no bloquear el uso normal; además obligaría a revisar el principio “100% por esfuerzo”.
- Implementar consentimiento por región, anuncios contextuales cuando corresponda, política de privacidad, edad mínima y borrado/exportación.
- Empezar con sponsor directo o una integración de ads; añadir Prebid solo cuando el volumen justifique la complejidad.
- Registrar `estimated_revenue` separado de `finalized_revenue`; nunca acreditar al usuario desde un callback de impresión del cliente.

### Corrección del costo Go

Para `M` suscripciones/tokens:

```text
mes promocional:     go_subscription_cost = M × USD 5
mes de renovación:   go_subscription_cost = M × USD 10
capacidad nominal:   M × USD 60/mes, solo si las cuotas son independientes
ventana corta:       M × USD 12/5h, solo si son independientes
ventana semanal:     M × USD 30/semana, solo si son independientes
```

Go tiene costo marginal bajo únicamente dentro de todas sus ventanas. Una vez agotadas, el costo es pérdida de servicio, top-up o tráfico Zen; por ello STANDARD siempre consume créditos y tiene rate limits.

### Fórmulas

```text
ad_revenue = impresiones_validas / 1000 × eCPM_final × fill_rate
operator_revenue = ad_revenue + sponsor_revenue
provider_cost = zen_actual_cost + go_subscriptions + go_topups
contribution = operator_revenue - provider_cost - infra - observabilidad - operación
redemption_rate = credits_spent / credits_earned
cost_per_verified_activity = provider_cost_attributed / verified_activities
```

No volver a calcular USD como `display_tokens × 0.001`. El precio en créditos es una política de producto; el costo USD es telemetría financiera.

### Simulador obligatorio

La route key administrativa de economía y un job diario mostrarán:

- DAU, requests/DAU y mix por modelo/tier.
- Input/output/cache tokens reales y costo Zen real.
- Uso de cada Go scope: 5 h, semana, mes y reset.
- OPEX Go promocional y de renovación por separado.
- Impresiones, fill, eCPM estimado/final, sponsor revenue.
- Infra/operación y contribución diaria/mensual.
- Escenarios bajo/base/alto con inputs editables, no un único “10k DAU”.

### Gates económicos

- No escalar adquisición pagada con contribución negativa.
- No aprobar margen usando el descuento de USD 5; usar renovación de USD 10.
- Circuit breaker global cuando `provider_cost` supere budget diario, y por cada Zen/Go scope al 75% alerta / 80% corte.
- No cambiar multiplicadores retroactivamente. Una nueva política aplica por `effective_at` y queda auditada.
- Si falta revenue finalizado, tratarlo como cero para decisiones de caja.

---

## 12. Modelo de datos mínimo

```text
users(
  id, email, status, created_at, deleted_at
)

wallets(
  id, user_id UNIQUE, currency, balance BIGINT CHECK balance >= 0,
  lifetime_earned BIGINT, version INT, updated_at
)

ledger_entries(
  id, wallet_id, type EARN|SPEND|REFUND, amount_signed BIGINT,
  idempotency_key, request_hash, policy_version, meta_json, created_at,
  CHECK((type IN (EARN, REFUND) AND amount_signed > 0) OR
        (type = SPEND AND amount_signed < 0)),
  UNIQUE(wallet_id, idempotency_key)
)

reward_policies(
  id, activity_type, credits_per_rep, daily_cap, effective_at, disabled_at
)

activity_sessions(
  id, user_id, status, challenge_hash, install_id_hash, model_version,
  policy_version, duration_ms, claimed_reps, verified_reps,
  evidence_hash, reject_reason, created_at, completed_at
)

provider_gateways(
  id, key, display_name, kind, auth_scheme, enabled, manifest_version
)

provider_endpoints(
  id, gateway_id, protocol, base_url, path_template,
  request_mapper_key, response_mapper_key, enabled
)

model_catalog(
  logical_id, provider_model_id, gateway_id, endpoint_id, tier,
  credit_price, limits_json, capabilities_json, enabled,
  manifest_version, updated_at
)

credential_deployments(
  id, gateway_id, pool_kind ZEN_FREE|GO|ZEN_PAID,
  secret_ref, quota_scope_id, subscription_ref,
  promo_ends_at, status, cooldown_until, created_at
)

api_routes(
  route_key, method, path_template, version, use_case_key,
  auth_policy_key, request_schema_key, response_schema_key,
  enabled, manifest_version
)

ui_navigation(
  route_key, screen_key, label_key, icon_key, order_index,
  required_capability, feature_flag, enabled, manifest_version
)

design_tokens(
  theme, token_key, token_type, token_value, contrast_pair,
  mode, version, enabled
)

feature_flags(
  key, default_value, rollout_json, starts_at, ends_at, enabled
)

pool_policies(
  gateway_id, pool_kind, min_active_deployments,
  max_window_pct, retry_policy_key, breaker_policy_key, enabled
)

outbox_events(
  id, event_type, aggregate_type, aggregate_id,
  payload_json, occurred_at, published_at, attempts
)

seed_runs(
  id, seed_version, checksum, manifest_version, actor,
  status, created_at, completed_at
)

credential_usage_windows(
  quota_scope_id, window_type, starts_at, ends_at,
  unit USD_MICRO|REQUEST|INPUT_TOKEN|OUTPUT_TOKEN,
  used_value BIGINT, limit_value BIGINT, source, updated_at
)

chat_quotes(
  id, user_id, logical_model_id, credit_cost, max_output_tokens,
  request_hash, expires_at, consumed_at
)

chat_runs(
  id, user_id, quote_id, logical_model_id, deployment_id,
  status, charged_credits, provider_cost_usd_micro,
  input_tokens, output_tokens, first_token_at, completed_at,
  idempotency_key, created_at,
  UNIQUE(user_id, idempotency_key)
)

ad_events(
  id, user_id, placement, network_event_id, status,
  estimated_revenue_micro, finalized_revenue_micro, occurred_at
)
```

Reglas:

- FK, índices y enums/check constraints se definen en migraciones.
- El secreto real no vive en `credential_deployments`.
- `deployment_id` nunca sale del backend.
- Evidencia cruda temporal y chunks SSE tienen TTL; metadata financiera/ledger sigue la política contable.
- Reconciliación diaria compara wallet↔ledger, chat usage↔proveedor y ad estimates↔finalized.

---

## 13. Seguridad, privacidad y abuso

- HTTPS obligatorio; `Permissions-Policy: camera=(self)` y CSP restrictiva.
- CORS same-origin, protección CSRF donde aplique y cookies seguras.
- `trustProxy` limitado a los rangos reales del reverse proxy, nunca abierto por conveniencia.
- Rate limits por usuario y por IP normalizada, límites de concurrencia, tamaño, input/output y duración.
- El área administrativa usa route keys separadas con RBAC y MFA; ninguna ruta de administración es pública.
- Egress de LiteLLM limitado a hosts aprobados de OpenCode.
- Validación estricta de schemas y allowlist; ignorar campos de costo/reward enviados por cliente.
- Errores sanitizados al usuario y detalles estructurados sin secretos en servidor.
- No guardar prompts/respuestas completos en observabilidad. Historial local por defecto.
- Política de retención, exportación y borrado; cámara y pose explicadas antes del permiso.
- Moderación y aceptación de términos antes de abrir chat; sin tools se reduce el riesgo de acciones laterales.
- Dependencias e imágenes fijadas por versión/digest y escaneo de vulnerabilidades.
- Threat model mínimo: robo de cuenta, replay de actividad, cliente modificado, double-spend, denial-of-wallet, prompt abuse, fuga de secretos, 429 masivo y admin comprometido.

---

## 14. Observabilidad

### Métricas técnicas

- `http_requests_total`, latencia p50/p95/p99 y error rate por ruta.
- `llm_requests_total{logical_model,gateway,status}`.
- `llm_ttft_seconds`, duración, input/output/cache tokens y costo real.
- `credential_window_usage_pct{scope,window}` sin labels de alta cardinalidad ni secretos.
- `provider_429_total`, cooldown, retries pre-stream y pool exhausted.
- `stream_resume_total`, eventos repetidos/perdidos, runs `PARTIAL|FAILED`.
- `wallet_conflict_total`, idempotency replay y reconciliation mismatch.
- `pose_load_ms`, inference fps, calibration failure, verification pass/reject reason.

### Funnel y producto

- Permiso de cámara aceptado/denegado.
- Calibración completada.
- Actividad iniciada, abandonada, enviada y verificada.
- Primera actividad→primer chat y tiempo hasta valor.
- D1/D7 por cohortes, no solo agregado.
- Credits earned/spent, redemption rate, balance distribution.
- FREE→STANDARD y STANDARD→PREMIUM por esfuerzo.

### Negocio

- Revenue estimado/finalizado por placement.
- Costo Zen, OPEX/top-up Go, infra y contribución.
- Costo por usuario activo y por actividad verificada.
- Capacidad restante por ventana Go y burn rate hasta reset.
- Fraude/replay y costo evitado.

Alertas iniciales:

- Uso de cualquier quota scope >75%; corte automático a 80%.
- Error LLM >5% durante una ventana sostenida.
- Reconciliation mismatch >0.
- Saldo negativo: severidad crítica e imposible por constraint.
- Provider cost/budget >80%.
- Aumento brusco de verificaciones rechazadas o reps por minuto.
- Backup o restore test fallido.

---

## 15. Work plan por fases y gates

### FASE 0 — Evidencia y bloqueadores

- **W0.1 Legal/comercial:** cerrar G0.1 y registrar restricciones por gateway, credencial, workspace y usuario final.
- **W0.2 Provider spike:** cliente mínimo para cada protocolo Zen/Go; non-stream, stream, usage, errores y cancelación.
- **W0.3 Pool múltiple:** configurar `N` Zen FREE, `M` Go y `P` Zen paid autorizados; determinar quota scopes y promoción/renovación por credencial.
- **W0.4 LiteLLM spike:** múltiples deployments por modelo lógico, routing nativo, cooldown y retry solo pre-stream; validar que no existe fallback a una key única.
- **W0.5 Economía:** simulador con costos por token/modelo, límites Go y revenue bajo/base/alto.
- **W0.6 Pose/UX:** prototipo de cámara, calibración y conteo en dispositivos objetivo; validar solo patrones visuales de las imágenes.
- **W0.7 DB-first:** diseñar `runtime_manifest`, `api_routes`, providers, catálogo, prices, design tokens y ejecutar el seeder dos veces en Postgres vacío.
- **W0.8 Decisiones:** fijar países/edad iniciales, nombre de créditos, reward inicial, daily cap y modelos de lanzamiento.
- **W0.9 Skills/tooling:** fijar versiones y configuración de TypeScript/Node, Python opcional, ESLint/Ruff, dependency-cruiser/import-linter, tests y Storybook/a11y sin introducir dependencias no justificadas.

**Exit:** G0.1–G0.10 cerrados. Si legal, pool, arquitectura, seeder o economía fallan, no se declara MVP aprobado.

### FASE 1 — Fundación y vertical privada

- **W1.1 Monorepo:** `apps/web`, `apps/api`, `apps/worker`, `packages/shared`, migraciones y compose local; mantener `domain/application/infrastructure/composition-root` separados.
- **W1.2 Infra:** TLS, Postgres, Redis, LiteLLM, secrets, healthchecks, backup/restore y CI.
- **W1.3 Seeder:** migraciones + `seed-runner` idempotente; seed separado por gateways, endpoints, modelos, precios, pools, rutas, policies, design tokens y navegación.
- **W1.4 Auth:** sesión segura, recuperación, roles admin y borrado de cuenta.
- **W1.5 Data core:** wallet/ledger/policies/catalog/credentials/routes/chat runs con constraints e idempotencia.
- **W1.6 PoolController:** scopes 5 h/semana/mes, 75/80%, cooldown por header y catálogo dinámico.
- **W1.7 Runtime manifest:** `DynamicRouteRegistry`, `CatalogRegistry`, `DesignTokenRegistry` y `RouteResolver` con validación de schema y manifest version.
- **W1.8 Observabilidad:** logs redactados, métricas, trazas y dashboards técnicos/económicos.
- **W1.9 Quality gates:** ESLint/Ruff, `check-file-lines`, dependency-cruiser/import-linter, typecheck, tests de arquitectura y ADR template.

**Exit:** contract tests, secret scan, seeder repetido, manifest/rutas DB-first, imports hexagonales, límite de líneas, ledger concurrency y restore pasan.

### FASE 2 — Esfuerzo y chat beta

- **W2.1 Design system:** componentes headless/compound, tokens DTCG desde manifest, estados, Storybook/A11y y visual regression; derivado de referencias sin copiar marcas ni cifras.
- **W2.2 Pose:** Web Worker, calibración, state machine, evidence y finalización segura de cámara.
- **W2.3 Verify:** challenge, replay protection, policy version, daily cap y crédito atómico.
- **W2.4 Catálogo/quotes:** FREE/Standard/Premium, costos en créditos y disponibilidad.
- **W2.5 Chat worker:** débito/refund, LiteLLM, Redis Streams, SSE y resume.
- **W2.6 Safety/limits:** input/output, concurrencia, abuse controls y errores sanitizados.
- **W2.7 E2E:** flexión→earn→FREE→STANDARD Go→PREMIUM Zen→resume→reconciliación.

**Exit:** beta cerrada con saldos correctos, ningún secreto expuesto y costos medidos.

### FASE 3 — Monetización y validación de producto

- **W3.1 Sponsor/ad placement:** natural, separado del reward, frecuencia limitada y consentimiento.
- **W3.2 Revenue reconciliation:** estimates, finalized y dashboard de contribución.
- **W3.3 Funnel/experimentos:** onboarding, calibración, reward y precios versionados.
- **W3.4 Operación:** alertas, runbooks, budgets, incidentes, términos y privacidad.
- **W3.5 Rollout:** cohortes pequeñas; ampliar solo con capacidad y contribución de renovación positivas.

**Exit:** producto medible y financiable sin depender del descuento del primer mes.

### FASE 4 — Retención y fuentes de esfuerzo

Orden recomendado, cada feature detrás de flag y experimento:

1. Quiz/puzzles server-authoritative y mapa de progreso inspirado en la referencia.
2. Modo batalla asincrónico; PvP en tiempo real solo después de controlar trampas/moderación.
3. Running GPS y tesoros únicamente con permisos, privacidad, batería, falsos positivos y sponsor real resueltos.
4. Ligas/amigos después de resolver abuso, bloqueo y reporting.

### FASE 5 — Optimización avanzada

- Cache exacta privada solo con baseline y ahorro real.
- RAG solo con corpus propio/licenciado, evaluación y propósito de producto.
- HNSW solo si la cache semántica tiene dataset, privacidad y ROI demostrados.
- Fusion/ensemble solo si el costo agregado tiene quote visible y contribución positiva por llamada.

---

## 16. Estrategia de pruebas

### Unitarias

- Geometría/histéresis de flexión con secuencias etiquetadas.
- Reward policy y daily cap por versión.
- Quotes, expiración, debit/refund e idempotencia.
- Cálculo de quota windows, 75/80% y resets.
- Selección de catálogo y autorización por tier.

### Integración

- Postgres real para wallet/ledger; no mocks para concurrencia.
- Redis real para rate limits, jobs y streams.
- Upstream falso con fixtures de `/responses`, `/messages`, `/chat/completions`, 429, timeout y stream cortado.
- LiteLLM con dos deployments falsos para probar balanceo sin consumir promociones/cuotas reales.
- Contract smoke controlado contra cada modelo/protocolo aprobado.

### Concurrencia y resiliencia

- Cientos de earns/spends/retries concurrentes sobre la misma wallet: saldo y ledger exactos.
- Mismo idempotency key con payload igual y distinto.
- Pool al 79%, 80%, cooldown y todos agotados.
- Desconexión antes/después del primer token; reanudación desde cada sequence id.
- Reinicio de API, worker, LiteLLM y Redis; comprobar refund/estado terminal.
- Postgres indisponible: no ejecutar inferencia pagada sin confirmar débito.

### Browser/device

- Android Chrome y iOS Safari objetivo, cámara frontal/trasera, portrait/landscape.
- Permiso concedido, denegado, ignorado y revocado.
- Baja luz, cuerpo parcial, una articulación oculta, dispositivo lento y pestaña en background.
- Sin freeze de UI; tracks apagados al salir.
- Lectores de pantalla, zoom 200%, teclado, contraste y reduced motion.

### Arquitectura, DB-first y límites

- `check-file-lines` falla si cualquier archivo de código versionado supera 200 líneas físicas.
- ESLint/TypeScript valida funciones, complejidad, tipos estrictos y dependencias prohibidas.
- Ruff/mypy/import-linter solo se ejecutan si existe un bounded context Python; no se permite Python accidental en F1.
- dependency-cruiser verifica `domain → nada externo`, `application → domain/ports` y adapters solo desde composition root.
- Scan de runtime bundle detecta modelos, precios, base URLs, paths de negocio o keys fuera de fixtures/seed/config DB.
- Postgres vacío: migraciones + seeder + seeder otra vez producen el mismo `runtime_manifest` y ninguna ruta usa `use_case_key` inexistente.
- Alterar una fila de catálogo, precio, gateway, ruta o token y cambiar `manifest_version` actualiza la API/PWA sin recompilar.
- El test confirma que `api_routes` nunca puede ejecutar un símbolo no registrado, SQL, `eval` o import dinámico arbitrario.

### Seguridad y privacidad

- Secret scan de repo, imagen, bundle, source maps y logs.
- Acceso horizontal a wallet/activity/chat run de otro usuario.
- CSRF/CORS/cookie, admin RBAC, rate-limit IPv4/IPv6 y proxy spoofing.
- Payloads enormes, modelo no permitido, reward/cost inyectado y replay de evidencia.
- Verificar TTL/borrado de chunks, evidencia y cuenta.

---

## 17. Riesgos, triggers y rollback

| Riesgo | Trigger | Mitigación/rollback |
|---|---|---|
| Uso comercial no autorizado | G0.1 sin confirmación | Mantener prototipo privado; no lanzar gateway público |
| Pool no suma capacidad | Scope compartido por cuenta/workspace/IP | Conservar pool autorizado, contabilizar scope compartido y reducir rollout; no evadir límites |
| Promo Go termina | `promo_ends_at` próximo | Alertar; presupuesto y decisiones ya usan USD 10/token/mes |
| Modelo/endpoint cambia | Contract test o `/models` diff | `DRAINING`, deshabilitar modelo y actualizar manifiesto |
| Go llega a 75/80% | Burn rate por 5 h/semana/mes | Alertar/cortar deployment; mostrar reset o FREE disponible |
| Zen paid excede budget | Costo diario/mensual | Deshabilitar PREMIUM, conservar FREE, refund de runs no iniciados |
| Ledger mismatch | Reconciliación distinta de cero | Pausar spend, mantener earn en cola y reparar desde ledger append-only |
| Pose cuenta mal | Abandono/rechazo/falsos positivos suben | Rollback de policy/model version; bajar cap; recalibrar |
| Fraude web deliberado | Costo fraudulento supera budget | Reducir reward/caps, revisión de riesgo; evaluar native attestation |
| Ad revenue menor | Finalized eCPM/fill bajo | Reducir rollout/costos, sponsors; no aumentar frecuencia de forma engañosa |
| SSE falla | Resume/error sostenido | Respuesta no-stream temporal; refund si no hubo output |
| Caída de VPS | Healthcheck/backup | Restaurar; beta acepta RTO mayor, producción migra DB y réplicas |
| Fuga de secreto | Detector/log/audit | Revocar, rotar, drenar deployment y revisar accesos |

---

## 18. Decisiones diferidas y gates

| Decisión | No activar antes de | Evidencia mínima |
|---|---|---|
| Prebid | Volumen que compense operación | Uplift de revenue frente a integración simple |
| Cache exacta | Baseline de prompts repetidos | Ahorro neto, privacidad y hit rate medidos |
| Cache semántica/HNSW | Dataset y evaluación offline | Precisión, fuga entre usuarios y ROI aceptables |
| RAG | Corpus propio/licenciado | Eval de relevancia, calidad y costo |
| Fusion | Demanda y margen por llamada | Quote 3× visible y contribución positiva |
| Running/tesoros | Retención de core | Permisos, fraude, batería y sponsors validados |
| PvP/batalla | Single-player retiene | Matchmaking, anti-cheat, moderación y reportes |
| App nativa | PWA limitada por fraude/performance | Beneficio mayor que costo de dos plataformas |

---

## 19. Preguntas que FASE 0 debe cerrar

1. ¿OpenCode autoriza explícitamente este uso para usuarios finales y el pool de credenciales del operador?
2. ¿Cuántas credenciales Zen FREE y suscripciones/tokens Go autorizados existen, a nombre de quién y cuándo vence cada promoción?
3. ¿Cada límite aplica por key, suscripción, workspace, cuenta o IP?
4. ¿Qué modelos/protocolos pasan contract test y qué usage/cost devuelven realmente?
5. ¿Países, edad mínima y régimen de consentimiento/ads iniciales?
6. ¿Sponsor directo, GAM u otra red tiene elegibilidad y revenue verificable?
7. ¿Cuál es el nombre visual de créditos y qué reward/precio inicial se probará?
8. ¿Cuál es el mínimo de dispositivos navegadores para beta?
9. ¿Qué `P` mínimo de credenciales Zen paid está autorizado y qué scopes comparten las credenciales?
10. ¿Qué campos pueden editarse en producción y quién aprueba el bump de `manifest_version`?
11. ¿Qué use-case/schema keys se publicarán en `api_routes` y qué namespaces quedan reservados para infraestructura?
12. ¿El contract de design tokens se mantendrá en formato DTCG y qué adapter generará las CSS variables?

---

## 20. Orden de ejecución

```text
FASE 0 gates
→ FASE 1 fundación segura
→ FASE 2 vertical esfuerzo→chat
→ FASE 3 monetización y rollout medido
→ FASE 4 retención
→ FASE 5 optimización avanzada
```

El primer entregable no es el monorepo completo: es el paquete de evidencia de FASE 0 con permiso comercial, matriz de protocolos, scopes reales del pool múltiple, costo por modelo y simulador de renovación. Solo después se implementa la vertical productiva.