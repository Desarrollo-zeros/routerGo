# Challenge administration

T060-T064 define the versioned challenge model, typed verification registry,
reward eligibility, and physical-safety boundaries. T065 adds the Studio
administration surface: operators with `challenges.manage` can create and
submit a draft, while `challenges.publish` is required to approve and publish
the immutable version.

The API persists definitions, versions, and reward rules in PostgreSQL. State
transitions are explicit: `DRAFT -> IN_REVIEW -> APPROVED`, and the associated
version becomes `PUBLISHED` only on approval. The admin client fails closed
without an authenticated API key; it does not present a disabled action as a
successful mutation.
