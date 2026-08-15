# Identity, organizations, RBAC, and audit

T010 adds durable persistence. T011 adds identity resolution contracts, T012 adds permission-based authorization policies, and T013 adds the transactional privileged-change boundary. Login, sessions, JWT/OAuth, authentication endpoints, and HTTP enforcement remain future integration work.

## Model

- `users` remains the existing identity record used by wallets, activity, chat, runs, and ads.
- `organizations` is the future tenant boundary with `PERSONAL`, `ADVERTISER`, `DEVELOPER`, or `INTERNAL` kind and explicit status.
- `organization_members` connects users to many organizations and enforces one membership per user/organization pair.
- `roles` are named bundles with explicit `GLOBAL` or `ORGANIZATION` scope. Global baseline roles are reusable definitions; organization-scoped roles carry their owning organization.
- `permissions` are stable `resource.action` capabilities. `role_permissions` stores the bundle relation and `member_roles` assigns roles to memberships.
- `audit_logs` stores actor, organization, action, resource, state snapshots, sanitized metadata, and correlation ID. It has no `updated_at` and is append-only.

## Baseline roles

The seed creates only system role definitions: `USER`, `OWNER`, `OPERATOR`, `ADVERTISER_ADMIN`, and `DEVELOPER_ADMIN`. The permission bundles follow least privilege: advertiser administration has campaign/content read capabilities only, developer administration has model/runtime read capabilities, and only the operator bundle contains global management capabilities. No user, password, token, or administrative credential is seeded.

Future application authorization must check a permission and the organization scope of the membership. It must not make access decisions from a role name alone. T012 owns those specifications and policies.

## Audit privacy

`PrivilegedChangeService` sanitizes audit metadata and outbox payloads before persistence. Passwords, API/provider/session secrets, tokens, and raw sensitive prompts must never be stored. The service requires an allowed `AccessDecision`, executes the mutation, audit append, and outbox append through one transaction, and uses `operationId` as the deterministic audit identity for duplicate detection.
