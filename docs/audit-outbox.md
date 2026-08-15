# Privileged changes, audit, and outbox

T013 provides the write boundary for privileged changes. A future application flow resolves an `IdentityContext`, evaluates authorization, and passes the resulting `AccessDecision` to `PrivilegedChangeService` together with a stable `operationId`, correlation ID, typed mutation, and versioned event.

The service rejects denied decisions before opening a transaction. For an allowed decision, `PrivilegedChangeUnitOfWork` gives the mutation a typed scope and executes these operations on one database client:

1. check whether the operation's audit ID already exists;
2. perform the bounded business mutation;
3. append one sanitized `audit_logs` row;
4. append one sanitized `outbox_events` row with ID `outbox:<operationId>`;
5. commit, or roll back every operation on failure.

Audit and outbox are separate concerns. The audit record is the durable security trail; the outbox event is the integration handoff for a later publisher. PostgreSQL adapters use `ON CONFLICT DO NOTHING`, while the application treats a duplicate as `DUPLICATE_OPERATION`. The deterministic audit primary key also protects concurrent retries: a losing transaction cannot commit its mutation if the operation has already completed.

The metadata sanitizer recursively removes explicit secret-bearing keys, including passwords, tokens, provider credentials, authorization headers, cookies, and raw prompts. The authorization reason and correlation ID remain available for traceability without placing identity, roles, or permissions into a god context.

T014 and T015 should extend the typed privileged scope with their own mutation ports. They must authorize before calling this service and must not write directly to PostgreSQL or publish an event outside the transaction.
