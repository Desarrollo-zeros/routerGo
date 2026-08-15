# RBAC authorization boundary

T012 consumes the verified `IdentityContext` produced by T011. Authentication and transport are outside this boundary.

## Application contract

`AuthorizePermissionUseCase` receives `identity`, `permission`, and an optional resource organization scope. It loads role assignments through `AuthorizationGrantReader`, then passes a domain-local `AuthorizationSubject` to the pure `AuthorizationPolicy`.

The projection preserves the single identity vocabulary: `userId`, `organizationId`, `membershipId`, and `membershipStatus`. The domain does not import the application `IdentityContext`; the explicit projection is the hexagonal adapter between those layers. A non-active membership is denied before grant evaluation.

`AuthorizationGrantReader.findRoleAssignments(membershipId)` is deliberately membership-scoped. A future adapter can resolve `member_roles` and role scope in one bounded query without loading every grant for a user or creating an N+1 authorization read pattern.

## Policy rules

- Permissions are explicit `resource.action` keys; role names and wildcards never grant access.
- Global roles require global scope metadata and may authorize any resource organization.
- Organization roles must belong to both the subject organization and the requested resource organization.
- Missing, inactive, or wrongly scoped grants fail closed with a typed `AccessDecision` reason.

Role-assignment persistence remains an outbound adapter concern. T013 consumes the resulting `AccessDecision` but does not reimplement authorization: a denied decision stops before the transaction, while an allowed decision may enter the privileged-change boundary. Authentication and transport remain outside both contracts.
