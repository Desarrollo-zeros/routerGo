# RBAC authorization boundary

T012 consumes the verified `IdentityContext` produced by T011. Authentication and transport are outside this boundary.

## Application contract

`AuthorizePermissionUseCase` receives `identity`, `permission`, and an optional resource organization scope. It loads role assignments through `AuthorizationGrantReader`, then passes a domain-local `AuthorizationSubject` to the pure `AuthorizationPolicy`.

The projection preserves the single identity vocabulary: `userId`, `organizationId`, `membershipId`, and `membershipStatus`. The domain does not import the application `IdentityContext`; the explicit projection is the hexagonal adapter between those layers. A non-active membership is denied before grant evaluation.

## Policy rules

- Permissions are explicit `resource.action` keys; role names and wildcards never grant access.
- Global roles require global scope metadata and may authorize any resource organization.
- Organization roles must belong to both the subject organization and the requested resource organization.
- Missing, inactive, or wrongly scoped grants fail closed with a typed `AccessDecision` reason.

Role-assignment persistence remains an outbound adapter concern. T013 audit behavior and authentication are intentionally not part of this contract.
