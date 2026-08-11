# ADR-004: Límite 200 líneas

Estado: Aceptado 2026-08-10

## Contexto
Archivos grandes ocultan deuda y violan SRP. AGENTS exige 200 líneas físicas máx para .ts/.js/.py/.sql.

## Decisión
CI falla si cualquier archivo versionado supera 200 líneas (eslint max-lines + scripts/check-file-lines.mjs). Funciones ≤40 líneas, CC ≤8, ≤4 params. Se extraen policies, mappers, value objects, repositories.

## Alternativas
- Excepciones por archivo especial: rechazada, genera precedente.
- Solo eslint: no cubre .py/.sql.

## Pruebas
CI ejecuta ambos checks + coverage de límite.

## Rollback
No aplica; límite es invariante.
