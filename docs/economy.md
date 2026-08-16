# RouterGo economy persistence

T020 establishes the durable accounting records used by the later economy
application flows. It does not implement reservation, settlement, release, or
reconciliation behavior.

## Units and invariants

- GoCredits are an internal integer unit. `credit_reservations` uses PostgreSQL
  `BIGINT`; it is not money and is not a provider-token balance.
- Provider cost, revenue, and USD budgets use integer micro-USD
  (`USD_MICRO`, one millionth of a USD). No floating-point financial values are
  persisted.
- Every budget has a positive finite limit and an explicit scope and time
  window. Credit budgets have no currency; USD budgets require `USD`.
- Reservation operations are idempotent through unique `operation_id`.
  `settled_credits + released_credits` cannot exceed the reserved amount.
- Provider cost entries retain token counters separately from `cost_microusd`,
  identify the pricing version, and require a provider gateway. Operation and
  provider request identifiers are unique when supplied.
- Revenue records separate gross and net micro-USD, require `net <= gross`,
  and distinguish `PENDING`, `FINALIZED`, and `REVERSED`. Finalized records
  require `finalized_at`.

## Deletion and corrections

Wallets and provider gateways cannot be deleted while accounting history
references them. Optional operational references such as quote, run, endpoint,
or ad event use `ON DELETE SET NULL` where historical accounting remains
valid. Business corrections are represented by adjustment/reversal rows linked
with `reversal_of`; the future application services must not rewrite accounting
history as a substitute for a correction event.

## Future flow

The intended application sequence is `QUOTE -> RESERVE -> EXECUTE -> SETTLE ->
RELEASE/REFUND`. T021 and T022 define the domain policy and budget circuit
breaker; T023 coordinates the state changes with a unit of work. T020 only
provides the persistence contract consumed by these policies.

## Domain policy boundaries

`CreditReservation` is the stateful domain aggregate for one reservation. A
new reservation starts as `RESERVED`; partial settlement or release keeps it
reserved, full settlement becomes `SETTLED`, and releasing all unused credits
becomes `RELEASED`. `EXPIRED` blocks settlement but permits an explicit release
of remaining credits; `CANCELLED` is terminal when no credits were consumed.
The aggregate never mutates a wallet or ledger and keeps `operationId` for the
future transactional idempotency boundary.

`EconomyBudgetPolicy` is a pure deny-by-default policy. It evaluates a single
already-selected budget against scope, period, actual spend, committed spend,
requested amount, and an economic circuit input. `OPEN` or disabled spending
denies immediately. This economic circuit is separate from the technical
reliability circuit in T005: the latter protects external calls, while this one
protects platform spending and subsidy limits. Pending or reversed revenue is
never treated as funding; only finalized USD micro-units can fund an
`AD_FUNDED_COMPUTE` scope.
