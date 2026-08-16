# RouterGo economy persistence

T020 establishes the durable accounting records used by the later economy
application flows. T021 now models the reservation lifecycle and T022 provides
the pure budget policy; application orchestration and reconciliation remain
future work.

## Units and invariants

- The user economy is `Wallet` plus GoCredits (`Credits`) and
  `credit_reservations`. GoCredits are an internal integer unit stored as
  PostgreSQL `BIGINT`; they are not money and are not provider-token balance.
- The platform economy is `economy_budgets`, provider costs, and revenue in
  integer micro-USD
  (`USD_MICRO`, one millionth of a USD). No floating-point financial values are
  persisted.
- GoCredits and USD micro-units are separate ledgers. There is no universal
  `creditToUsd`, `usdToCredits`, fixed exchange rate, or fixed GoCredit value.
  A future versioned pricing policy may calculate both values for a quote, but
  it must not convert historical accounting units.
- Every budget has a positive finite limit and an explicit scope and time
  window. Credit budgets have no currency; `USD_MICRO` budgets require `USD`.
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
RELEASE/REFUND`. T021 defines the reservation lifecycle and T022 defines the
budget circuit policy; T023 must coordinate the state changes with a unit of
work. T020 provides the persistence contract consumed by these policies.

## Domain policy boundaries

`CreditReservation` is the stateful domain aggregate for one reservation. A
new reservation starts as `RESERVED`; partial settlement or release keeps it
reserved, full settlement becomes `SETTLED`, and releasing all unused credits
becomes `RELEASED`. `EXPIRED` blocks settlement but permits an explicit release
of remaining credits; `CANCELLED` is terminal when no credits were consumed.
Cancellation changes only the reservation lifecycle: it does not release or
refund credits, so a future application transaction must coordinate any
accounting effect. The aggregate never mutates a wallet or ledger and keeps
`operationId` for the future transactional idempotency boundary.

`EconomyBudgetPolicy` is a pure deny-by-default policy. It evaluates a single
already-selected budget against scope, period, actual spend, committed spend,
requested amount, and an economic circuit input. `OPEN` or disabled spending
denies immediately. This economic circuit is separate from the technical
reliability circuit in T005: the latter protects external calls, while this one
protects platform spending and subsidy limits. Pending or reversed revenue is
never treated as funding; only finalized USD micro-units can fund an
`AD_FUNDED_COMPUTE` scope. The policy is correct for the supplied snapshot; it
does not claim to solve concurrent readers, which belongs to T023/T024.
