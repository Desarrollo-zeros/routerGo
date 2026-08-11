# ADR-005: Frontera Node/TS

Estado: Aceptado 2026-08-10

## Contexto
F1 es Node/TypeScript (Fastify, worker, PWA). Python solo si aporta valor aislado.

## Decisión
Core F1 100% Node/TS. Python solo detrás de port como servicio aislado, con ADR, si se demuestra necesidad (ej. model evaluation offline). No duplicar lógica entre lenguajes.

## Alternativas
- Microservicio Python para pose: innecesario, pose corre en browser.
- Compartir lógica via shared: acopla bounded contexts.

## Pruebas
import-linter solo si aparece bounded context Python.

## Rollback
Eliminar servicio Python y revertir a TS si aislamiento falla.
