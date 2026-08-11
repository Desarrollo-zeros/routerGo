# ADR-001: Arquitectura hexagonal Ports & Adapters

Estado: Aceptado 2026-08-10

## Contexto
RouterGo necesita aislar reglas de negocio (wallet, actividad, quote) de Fastify, Postgres, Redis, LiteLLM y proveedores. El plan Rev.6 exige SOLID y 200 líneas/archivo.

## Decisión
Implementar hexagonal puro en `apps/api/src`:
- `domain` entidades/value-objects/policies/events sin dependencias framework.
- `application` use-cases + ports inbound/outbound.
- `infrastructure` adapters Postgres/Redis/LiteLLM/Provider.
- `composition-root` único wiring.
- `infrastructure/http` solo valida y delega.

## Alternativas rechazadas
- MVC fat controller: acopla reglas a Fastify, impide test de concurrencia.
- Clean con capa service genérica: GodService viola SRP.

## Impacto SOLID
SLID estricto, dependency-cruiser verifica imports. Cada adapter cumple contrato port (Liskov).

## Pruebas
Dependency-cruiser + import tests + wallet concurrency sobre Postgres real.

## Rollback
Revertir wiring a controller directo requiere borrar ports; deuda inmediata.
