# Runtime manifest lifecycle

RouterGo publishes one immutable runtime snapshot at a time. PostgreSQL remains
the source of truth; Redis only accelerates publication propagation.

## Public contract

`GET /runtime-manifest` returns the active snapshot with `version` and
`contentHash`. API operations are under `apiRoutes`. Product navigation is
separate under:

```json
{
  "ui": {
    "routes": [{ "route_key": "wallet-get", "path": "/wallet", "screen_key": "wallet", "enabled": true }],
    "navigation": [{ "route_key": "wallet-get", "screen_key": "wallet", "label_key": "nav.wallet", "order_index": 2 }]
  }
}
```

UI routes do not contain HTTP methods, use cases, or request/response schemas.
The backend publishes screen keys and configured paths; React components remain
a compiled frontend allow-list. Internal snapshot aliases are retained only for
backend compatibility and are not part of this public response.

## Publication and rollback

`PublishRuntimeManifest` builds a candidate from current operational tables,
validates schema and cross-references, then uses T013's
`PrivilegedChangeService` for one transaction containing the snapshot, active
pointer, audit row, and outbox event. `runtime.publish` is the required
permission. Versions use the locked active-state row plus the maximum retained
version, so a rollback does not reuse a number.

`RollbackRuntimeManifest` reactivates an existing snapshot and retains every
newer snapshot. Both operations accept `expectedActiveVersion` and fail with
`VERSION_CONFLICT` when the caller is stale. The operation ID is shared by the
audit and outbox records, so retries cannot create another version.

## Persistence and cache

`runtime_manifest_snapshots` is append-only and protected by a database trigger.
`runtime_manifest_state` is the explicit active pointer; `MAX(version)` is never
used to decide what is active. The initial seed creates immutable snapshot v1.

After the database commit, the Redis adapter writes `manifest:<version>` and
`manifest:current`. A Redis failure is reported through the runtime telemetry
port and does not turn a durable publication into a rollback. The HTTP loader
reads the active pointer and snapshot from PostgreSQL, so stale or missing cache
data cannot produce an empty manifest.

## T014 convergence

The web client consumes only the canonical public projection. Runtime tokens are
accepted through a fixed CSS-variable registry, labels through a fixed local
copy registry, and capabilities remain deny-by-default. No remote code or
frontend capability adapter is part of this phase.
