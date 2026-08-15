# Identity domain and application boundaries

T011 models identity facts without implementing authentication or authorization.

## Domain

- `User` is active only in `ACTIVE` status. `SUSPENDED` and `DELETED` users cannot resolve an operational identity context.
- `Organization` owns its name, slug, kind, and lifecycle status. `SUSPENDED` and `DISABLED` organizations are not active.
- `OrganizationMember` links exactly one user to exactly one organization. Only `ACTIVE` membership is operational.
- `OrganizationSlug` normalizes whitespace/case and rejects invalid slug syntax.

`OrganizationMember.isActiveFor` verifies ownership and the active status of all three objects. It does not evaluate roles or permissions.

## Application

`UserRepository`, `OrganizationRepository`, and `MembershipRepository` are segregated outbound ports returning domain objects, never SQL rows. The query use cases map missing records to typed `IdentityError` codes and leave repository failures unchanged.

`ResolveIdentityContextUseCase` verifies user, organization, and membership ownership/status, then returns only `userId`, `organizationId`, `membershipId`, and `membershipStatus`. T012 can consume this trusted identity context to evaluate authorization without making Identity depend on RBAC.
