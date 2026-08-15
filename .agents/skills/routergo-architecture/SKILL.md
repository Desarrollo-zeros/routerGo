---
name: routergo-architecture
description: Apply RouterGo SOLID, hexagonal architecture, design patterns, resilience, and code-size gates.
---
# RouterGo Architecture

Mandatory constraints:
- Domain imports no framework/infrastructure.
- Application depends only on domain + ports.
- Infrastructure implements ports and maps technology errors.
- Composition root wires concrete adapters.
- Every code file <200 physical lines; function <=40 lines; CC <=8.

Before coding, name the concrete pattern and problem it solves. Prefer Strategy, Adapter, Factory, Repository/Data Mapper, UnitOfWork, Specification, State, Facade, Registry, Outbox, Circuit Breaker/Bulkhead.

For external dependencies define: timeout budget, retryable errors, max attempts, backoff+jitter, idempotency behavior, circuit breaker, fallback, telemetry. Never retry an LLM stream across providers after a user-visible token.

For cross-context work, use explicit application contracts/events; avoid writing another context's tables directly.
