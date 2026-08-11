# ADR-003: Pools múltiples N+M+P

Estado: Aceptado 2026-08-10

## Contexto
Operador pagará N Zen FREE + M Go + P Zen paid. Single-key global rompe disponibilidad y viola términos si scopes compartidos. LiteLLM debe balancear sin replicar.

## Decisión
`credential_deployments` (gateway_id, pool_kind, secret_ref, quota_scope_id, cooldown_until). `PoolController` filtra `usage>=80%` o cooldown y publica elegibles a Redis; LiteLLM balancea por model_name lógico (un deployment por credencial). `LiteLlmConfigAdapter` genera config desde DB. Costo Go: M*5 promo, M*10 renovación. Si scope compartido, simulador cuenta una cuota.

## Alternativas
- Rotación manual key 2 vs key 3: frágil, requiere código por key.
- Balanceo propio: duplica lógica LiteLLM.

## Pruebas
Contract tests con 2 deployments falsos por modelo; chaos 429 con retry_after; 80% cutoff.

## Rollback
Deshabilitar deployment fallido, drenar, rotar secret_ref.
