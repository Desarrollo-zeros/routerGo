# RouterGo — Plan de convergencia visual

Estado: `BASELINE COMPLETADO; OAuth social pendiente de backend`
Propietario: frontend/runtime UI
Alcance: PWA pública, autenticación, Studio y Ads Manager
Última revisión: 2026-08-16

## Objetivo

Llevar las superficies visuales reales de RouterGo a una experiencia coherente
con los mockups de referencia: producto de entrenamiento, GoCredits y acceso a
IA con una estética oscura técnica, jerarquía fuerte, navegación responsive y
estados honestos. El backend, los contratos runtime y los datos existentes son
la fuente de verdad; la UI no inventa capacidades que todavía no tienen API.

## Alcance

Se trabaja sobre:

- inicio de sesión y registro;
- shell autenticado, header, sidebar y navegación móvil;
- Actividad, Billetera, Chat, Batallas, Treasure, Aprendizaje, Ranking y Ayuda;
- portal público de Developer API;
- RouterGo Studio / CMS operativo;
- Ads Manager / portal de anunciantes;
- tokens, tipografía, iconografía, estados, responsive y accesibilidad.

No se implementan en este ciclo nuevos contratos de autenticación, pagos,
RBAC, proveedor de IA, APIs de desarrollador, CMS, Ads, Battles, Treasure o
Skills. Cuando una referencia muestra una capacidad inexistente, se conserva un
estado vacío, bloqueado o pendiente explícito.

## Referencias visuales

| Superficie | Referencias |
| --- | --- |
| Auth / landing | `img/ChatGPT Image 16 ago 2026, 02_29_13 a.m. (1).png`, `img/d2b35151-3875-426d-8ebc-eadbbffb8833.png`, `img/IMG_2870.PNG` |
| Actividad / GoCredits | `img/3528239b-5d4b-49bb-a532-1a47f9b631d5.jpg`, `img/4311d071-c4fb-40e9-ab9a-bb359d3db562.jpg`, `img/35000db5-72f0-4d60-9e0a-0aad9830e1d3.jpg`, `img/261eafa4-34e5-43e5-83d6-81bd0f88eeaa.jpg`, `img/ChatGPT Image 16 ago 2026, 02_36_35 a.m. (2).png` |
| Billetera | `img/ChatGPT Image 16 ago 2026, 02_36_35 a.m. (3).png`, `img/IMG_2870.PNG` |
| Chat | `img/ChatGPT Image 16 ago 2026, 02_36_35 a.m. (4).png`, `img/d2b35151-3875-426d-8ebc-eadbbffb8833.png` |
| Batallas | `img/87fa9f2e-9846-4d08-b953-ed6048679fb3.jpg`, `img/ChatGPT Image 16 ago 2026, 02_36_35 a.m. (5).png` |
| Aprendizaje / Ranking | `img/ChatGPT Image 16 ago 2026, 02_36_35 a.m. (6).png`, `img/2814434e-ac98-43fa-b779-69888e81bc3f.png`, `img/IMG_2874.PNG` |
| Studio | `img/d5c9157e-4402-4185-be08-cc1ad771c85a.png`, `img/IMG_2871.PNG` |
| Advertiser | `img/9fa224b5-ec69-4170-b743-e1cf2a192d02.png`, `img/IMG_2873.PNG` |
| Developer | `img/5e6bd5ec-514b-4d0b-8ca5-edc51dcbd33c.png`, `img/IMG_2872.PNG`, `img/IMG_2872 (1).PNG` |
| Dirección de arte | `img/ChatGPT Image 16 ago 2026, 02_37_42 a.m.png` |

Las marcas de terceros que aparecen en los mockups son referencias de
composición. La implementación usa RouterGo, GoCredits y los patrocinadores
que entregue la API real.

## Contrato visual común

- Fondo `#070914`/`#0b1020`, superficies azul-negro y borde violeta tenue.
- Violeta como acción primaria; magenta únicamente para énfasis de progreso o
  recompensa; cyan/verde solo para estados semánticos.
- Tipografía sans legible, títulos compactos, cuerpo con contraste AA y números
  tabulares para saldo, XP y métricas.
- Radios principalmente de 8–12px; tarjetas grandes solo cuando agrupan una
  tarea completa. No usar gradientes o glow para decorar cada elemento.
- Espaciado basado en 4/8/12/16/24/32px y controles accionables de mínimo 44px.
- Todo estado remoto debe cubrir loading, vacío, error, offline, permisos y
  saldo insuficiente cuando aplique.
- `DesignTokenRegistry`, `NavigationRegistry`, `RouteRegistry`, feature flags y
  contenido publicado siguen siendo la fuente runtime; no duplicar configuración
  operacional en React/CSS.
- Respeta 320/360/390/430px, tablet y 1280/1440/1920px; sin overflow horizontal.
- Respeta `prefers-reduced-motion`, foco visible, teclado y nombres accesibles.

## Ejecución verificable

| ID | Trabajo | Aceptación | Estado |
| --- | --- | --- | --- |
| V001 | Inventario visual y contrato común | Todas las referencias están mapeadas y los principios quedan documentados | `DONE` |
| V002 | Baseline reproducible | Screenshots de auth y rutas reales en desktop/mobile, sin datos ficticios | `DONE` |
| V003 | Foundation de tokens y CSS | Variables y estilos comunes reutilizables, archivos de código bajo 200 líneas | `DONE` |
| V004 | Marca e iconografía | Logo RouterGo, GoCredits e iconos consistentes y accesibles | `DONE` |
| V005 | Shell y navegación runtime | Sidebar desktop, cinco accesos móviles + `Más`, iconos de `icon_key`, estado activo y foco | `DONE` |
| V006 | Estados y primitivas | Loading, empty, error, locked, badge, metric, panel y CTA sin lógica de negocio | `DONE` |
| V007 | Auth | Login/registro responsive, sesión email real, botones Google/GitHub y error honesto si falta configuración OAuth | `PARTIAL — OAuth backend pendiente` |
| V008 | Actividad | Hero de ejercicio real, cámara, recompensa, patrocinio y CTA con jerarquía desktop/mobile | `DONE` |
| V009 | Billetera | Saldo, historial, estadísticas y errores reales con composición de dashboard | `DONE` |
| V010 | Chat y catálogo | Selector, coste, composer y estados reales con estructura preparada para historial sin simularlo | `DONE` |
| V011 | Batallas | Preparación y CTA sobre el contrato real; formatos no soportados aparecen bloqueados | `DONE` |
| V012 | Treasure | Lista, privacidad y progreso existente; mapa sin falsa precisión geográfica | `DONE` |
| V013 | Aprendizaje y ranking | Progreso publicado y leaderboard real con jerarquía de ruta/podio sin inventar badges | `DONE` |
| V014 | Ayuda y Developer | Ayuda clara; Developer muestra únicamente rutas públicas y estados reales | `DONE` |
| V015 | Studio | Shell con navegación separada, métricas y módulos publicados existentes, responsive | `DONE` |
| V016 | Ads Manager | Shell con balance, campañas, creatividades y analytics reales; formularios operables | `DONE` |
| V017 | QA visual | Revisión por screenshot en todos los breakpoints y corrección de overflow/jerarquía | `DONE` |
| V018 | Gates | typecheck, lint, lines, arch, secrets, tests, build, DB y E2E verdes | `DONE` |

## Capacidades explícitamente bloqueadas

No se deben simular para llenar un mockup:

- OAuth social, recuperación de contraseña y verificación avanzada;
- perfil social, amigos, badges, retos diarios y ligas si no hay endpoint;
- matchmaking, rondas, historial y estadísticas de batalla;
- topología geográfica detallada o progreso de Treasure no publicado;
- historial de conversaciones y acciones rápidas del Chat no entregadas por API;
- creación de API keys, métricas, webhooks y playground de Developer;
- usuarios, RBAC, moderación y analytics de Studio;
- targeting, fondeo, aprobación de creatividades y facturación publicitaria.

## Validación

Cada bloque debe validarse con datos reales y, cuando corresponda, con:

```text
pnpm typecheck
pnpm lint
pnpm check:lines
pnpm check:arch
pnpm check:secrets
pnpm test
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm test:e2e
```

Evidencia de la última convergencia (2026-08-16): `pnpm install
--frozen-lockfile`, `pnpm typecheck`, `pnpm lint` (0 errores; 9 warnings
preexistentes del API), `pnpm check:lines`, `pnpm check:arch`,
`pnpm check:secrets`, `pnpm test` (341 API + 15 web + 11 admin + 3 Ads),
`pnpm build` y `pnpm test:e2e` (11 web + 2 admin) pasan. La migración y las
dos ejecuciones consecutivas de seed pasan con checksum estable
`6fd8c09249cd7207`. PostgreSQL, Redis y LiteLLM están `healthy`.

La revisión visual debe cubrir `/`, `/wallet`, `/chat`, `/battles`,
`/treasure`, `/learning`, `/ranking`, `/help`, `/developers`, Studio y Ads
Manager en 320, 390, 430, 768, 1280 y 1440px. Debe comprobarse foco por teclado,
zoom, reduced motion, errores de API, sesión no autenticada y navegación por
teclado. Un comando solo se marca `PASS` con salida fresca.

## Definition of Done

- Todas las vistas tienen shell, jerarquía, navegación y responsive coherentes.
- El contenido operativo proviene de runtime/API; no hay hardcodes duplicados.
- La navegación móvil no tapa contenido y el menú `Más` es accesible.
- No hay errores 500, imports remotos frágiles ni estados de error presentados
  como éxito.
- No se inventan datos para igualar una imagen.
- Todos los gates aplicables pasan y el documento se actualiza con evidencia.

## Riesgos y decisiones

- La referencia es más rica que los contratos actuales. Se prioriza la verdad
  funcional sobre la densidad ornamental.
- Las imágenes de mockup no se convierten automáticamente en assets de producto;
  se usan como guía de composición y se preservan los assets licenciados/locales.
- Las modificaciones se mantienen dentro de frontend y shells visuales. Cambiar
  contratos API requiere una tarea separada y no forma parte de este documento.

## Acceso social

La pantalla ya ofrece Google y GitHub como proveedores, pero no se incluyen
client IDs, secretos ni callbacks en el repositorio. Para activar el redirect
real se deben configurar en el entorno de la PWA:

```text
VITE_GOOGLE_OAUTH_URL=https://<routergo-auth>/oauth/google
VITE_GITHUB_OAUTH_URL=https://<routergo-auth>/oauth/github
```

Con la variable vacía, el botón no finge autenticación: muestra que el
proveedor no está configurado y el usuario puede continuar con email. El
endpoint de callback y el intercambio de sesión pertenecen a Identity/Auth y
deben ser implementados en una tarea backend separada antes de marcar OAuth
como `DONE`.
