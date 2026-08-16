# RouterGo economy persistence

T020 establishes the durable accounting records used by the later economy
application flows. T021 models the reservation lifecycle, T022 provides the
pure budget policy, and T023 now coordinates user-credit accounting through
PostgreSQL transactions.

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
- Settle and release command results use `credit_reservation_operations` for
  durable per-command idempotency; reserve uses the reservation's unique
  `operation_id`.
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
RELEASE/REFUND`. T021 defines the reservation lifecycle, T022 defines the
budget circuit policy, and T023 coordinates user-credit state changes with a
transactional unit of work. T025 will connect this foundation to quote/run
execution and any independent platform-cost budget decision.

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
`AD_FUNDED_COMPUTE` scope. T024's concurrency hardening is specific to user
GoCredit reservations; platform budget readers remain a later boundary.

## T023 accounting boundary

`Wallet.balance` is the currently available GoCredit balance. Reserve debits
the full requested amount and appends one `SPEND` ledger entry. Settle records
actual consumption on the reservation only; it does not debit the wallet a
second time and does not create a zero-value ledger row. Release credits the
unused amount and appends one positive `REFUND` entry.

The canonical flow is therefore `1000 - 100 + 28 = 928`: 72 GoCredits are the
net user cost. The reservation ends with `reserved=100`, `settled=72`,
`released=28`, `remaining=0`, and status `RELEASED`. A mixed settle/release
completion remains rehydratable as `RELEASED`.

`ReserveCredits`, `SettleCredits`, and `ReleaseCredits` run through a small
Economy Unit of Work. PostgreSQL locks the wallet for reserve and release and
locks the reservation row for settle and release. Existing-reservation
mutations use the consistent reservation-then-wallet order; reserve only needs
the wallet lock. Wallet, ledger, reservation, and command-idempotency writes
commit or roll back together. No Redis lock or in-memory mutex is part of the
correctness boundary.

Reserve idempotency is backed by `credit_reservations.operation_id` and its
`reserve:<operationId>` ledger key. Settle and release use independent command
IDs in `credit_reservation_operations`; release also uses
`release:<operationId>` for its `REFUND` entry. Repeating a command returns its
stored result without another economic effect.

T023 intentionally does not evaluate `EconomyBudgetPolicy`: it moves user
GoCredits, while platform cost is a separate `USD_MICRO` concern and no
conversion exists. Quote/run integration and any durable platform-budget
commitment belong to T025/T026 according to their later acceptance criteria.
Caller authentication and wallet ownership remain API-boundary concerns.

## Concurrency & Idempotency Guarantees

PostgreSQL is the authority for economic correctness. Reserve locks the wallet;
settle and release lock the reservation before locking the wallet when a
refund is required. Every mutation remains inside one transaction, so a failed
wallet, reservation, ledger, or idempotency write rolls back all earlier writes.

The same operation ID with the same economic payload replays the committed
result and cannot create another debit, settlement, refund, or ledger row. The
same ID with a different wallet, reservation, operation kind, expiry, or amount
returns `IDEMPOTENCY_CONFLICT`. A retry after rollback can use the same ID
because the idempotency record is committed atomically with the mutation.

Reservation state is reconciled as `reserved = settled + released + remaining`
and `settled + released <= reserved`. Wallet balances reconcile exactly with
the signed ledger movements; no Redis lock or in-memory mutex participates in
this correctness boundary.
