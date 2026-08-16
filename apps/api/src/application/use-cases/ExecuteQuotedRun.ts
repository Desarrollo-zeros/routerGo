import { nanoid } from 'nanoid';
import { ChatRun } from '../../domain/entities/ChatRun';
import type { Clock } from '../ports/outbound/Clock';
import type { UnitOfWork, UnitOfWorkFactory } from '../ports/outbound/UnitOfWork';
import type { ProviderPort, ProviderResponse } from '../ports/outbound/provider-port';
import type { BudgetEvaluatorPort } from '../ports/outbound/BudgetEvaluatorPort';
import type { ExecutionTargetPort } from '../ports/outbound/ExecutionTargetPort';
import type { UsagePricingPort } from '../ports/outbound/UsagePricingPort';
import type { ExecuteQuotedRunInput, ExecuteQuotedRunOutput, ExecuteQuotedRunPort } from '../ports/inbound/ExecuteQuotedRunPort';
import { EconomyOperationError } from '../errors/EconomyOperationError';
import { ExecuteQuotedRunError, ProviderExecutionError, type ProviderFailureOutcome } from '../errors/ExecuteQuotedRunError';
import { ExecuteFreeRun } from '../services/ExecuteFreeRun';
import type { ReserveCreditsPort, SettleCreditsPort, ReleaseCreditsPort, ReserveCreditsInput, SettleCreditsInput, ReleaseCreditsInput, CreditReservationResult } from '../ports/inbound/CreditReservationOperations';
type CreditOperation =
  | { kind: 'reserve'; input: ReserveCreditsInput }
  | { kind: 'settle'; input: SettleCreditsInput }
  | { kind: 'release'; input: ReleaseCreditsInput };
export interface ExecuteQuotedRunDependencies {
  uowFactory: UnitOfWorkFactory;
  creditOperations: { reserve: ReserveCreditsPort; settle: SettleCreditsPort; release: ReleaseCreditsPort };
  budget: BudgetEvaluatorPort;
  provider: ProviderPort;
  target: ExecutionTargetPort;
  pricing: UsagePricingPort;
  clock: Clock;
  idGenerator?: () => string;
}
export class ExecuteQuotedRunUseCase implements ExecuteQuotedRunPort {
  private readonly idGenerator: () => string;
  private readonly freeRun: ExecuteFreeRun;
  constructor(private readonly dependencies: ExecuteQuotedRunDependencies) {
    this.idGenerator = dependencies.idGenerator ?? nanoid;
    this.freeRun = new ExecuteFreeRun(dependencies.uowFactory, dependencies.provider);
  }

  private get uowFactory(): UnitOfWorkFactory { return this.dependencies.uowFactory; }
  private get creditOperations(): ExecuteQuotedRunDependencies['creditOperations'] { return this.dependencies.creditOperations; }
  private get budget(): BudgetEvaluatorPort { return this.dependencies.budget; }
  private get provider(): ProviderPort { return this.dependencies.provider; }
  private get target(): ExecutionTargetPort { return this.dependencies.target; }
  private get pricing(): UsagePricingPort { return this.dependencies.pricing; }
  private get clock(): Clock { return this.dependencies.clock; }
  async execute(input: ExecuteQuotedRunInput): Promise<ExecuteQuotedRunOutput> {
    assertInput(input);
    const quote = await this.loadQuote(input);
    if (quote.isExpired(this.clock.now())) throw new ExecuteQuotedRunError('QUOTE_EXPIRED', 'Quote has expired');
    if (!quote.isOwnedBy(input.userId)) throw new ExecuteQuotedRunError('FORBIDDEN', 'Quote belongs to another user');
    const model = await this.target.resolve(quote.modelId);
    if (!model) throw new ExecuteQuotedRunError('PROVIDER_EXECUTION_FAILED', 'No execution target is available');
    const decision = await this.budget.evaluate({ modelId: quote.modelId, gatewayId: model.gatewayId, estimatedPlatformCostMicrousd: quote.estimatedPlatformCostMicrousd, now: this.clock.now() });
    if (!decision.allowed) throw new ExecuteQuotedRunError('BUDGET_DENIED', `Budget denied: ${decision.reason}`);
    const claimed = await this.claimRun(input, quote);
    input.onRunCreated?.(claimed.run.id);
    if (!claimed.created) return this.reused(claimed.run);
    if (quote.creditPrice.isZero()) return this.freeRun.execute(input, claimed.run.id, model);
    let reservation: CreditReservationResult;
    try {
      reservation = await this.reserve(input, quote, claimed.run);
    } catch (error) {
      await this.updateRun(claimed.run.id, (run) => run.markFailed(errorCode(error)));
      throw error;
    }
    await this.markReserved(claimed.run.id, reservation.reservationId);
    let response: ProviderResponse;
    try {
      const request = { model: model.providerModelId, messages: input.messages, maxTokens: quote.maxOutputTokens, stream: input.stream, userId: input.userId, idempotencyKey: input.idempotencyKey }; response = input.stream ? await this.provider.stream(request, model.endpoint, (chunk) => input.onChunk?.({ delta: chunk.delta, done: chunk.done })) : await this.provider.call(request, model.endpoint);
    } catch (error) {
      return this.failProvider(claimed.run.id, quote, reservation.reservationId, error);
    }
    return this.complete(claimed.run.id, quote, reservation.reservationId, response);
  }
  private async loadQuote(input: ExecuteQuotedRunInput) {
    return this.uowFactory.withTransaction(async (uow) => {
      const quote = await uow.quotes.findById(input.quoteId);
      if (!quote) throw new ExecuteQuotedRunError('QUOTE_NOT_FOUND', 'Quote was not found');
      return quote;
    });
  }
  private async claimRun(input: ExecuteQuotedRunInput, quote: Awaited<ReturnType<ExecuteQuotedRunUseCase['loadQuote']>>): Promise<{ run: ChatRun; created: boolean }> {
    return this.uowFactory.withTransaction(async (uow) => {
      const existing = await uow.runs.findByIdempotency(quote.walletId, input.idempotencyKey);
      if (existing) return { run: existing, created: false };
      const now = this.clock.now();
      const run = ChatRun.create({ id: this.idGenerator(), quoteId: quote.id, userId: input.userId, walletId: quote.walletId, modelId: quote.modelId, status: 'PENDING', creditsDebited: quote.creditPrice.toString(), idempotencyKey: input.idempotencyKey, createdAt: now, updatedAt: now });
      if (await uow.runs.createIfAbsent(run)) return { run, created: true };
      const claimed = await uow.runs.findByIdempotency(quote.walletId, input.idempotencyKey);
      if (!claimed) throw new ExecuteQuotedRunError('RECONCILIATION_REQUIRED', 'Run claim disappeared');
      return { run: claimed, created: false };
    });
  }

  private async reserve(input: ExecuteQuotedRunInput, quote: Awaited<ReturnType<ExecuteQuotedRunUseCase['loadQuote']>>, run: ChatRun) {
    if (run.status !== 'PENDING') throw new ExecuteQuotedRunError('RUN_ALREADY_EXECUTING', 'Run was claimed by another execution');
    return this.economyOperation({ kind: 'reserve', input: { operationId: `run:${run.id}:reserve`, walletId: quote.walletId, credits: quote.creditPrice.value, reservationId: `reservation:${run.id}`, expiresAt: quote.expiresAt, quoteId: quote.id, runId: run.id } });
  }

  private async markReserved(runId: string, reservationId: string): Promise<void> {
    await this.updateRun(runId, (run) => { run.markReserved(reservationId); run.markRunning(); });
  }

  private async complete(runId: string, quote: Awaited<ReturnType<ExecuteQuotedRunUseCase['loadQuote']>>, reservationId: string, response: ProviderResponse): Promise<ExecuteQuotedRunOutput> {
    const usage = validateUsage(response);
    const actual = this.pricing.price({ quote, response });
    if (actual < 0n || actual > quote.creditPrice.value) {
      await this.markReconciliation(runId, 'USAGE_EXCEEDS_RESERVATION', response, usage);
      throw new ExecuteQuotedRunError('USAGE_EXCEEDS_RESERVATION', 'Actual user credits exceed the reservation');
    }
    try { await this.settleAndRelease(runId, reservationId, quote.creditPrice.value, actual); }
    catch (error) {
      await this.markReconciliation(runId, error instanceof EconomyOperationError ? error.code : 'SETTLEMENT_FAILED', response, usage);
      throw new ExecuteQuotedRunError(compensationCode(error), 'Economic finalization requires reconciliation', { cause: error });
    }
    await this.updateRun(runId, (run) => { run.recordProviderOutcome(outcome(response, usage)); if (actual > 0n) run.markEconomySettled(); else run.markEconomyReleased(); run.markCompleted(); });
    return { runId, status: 'COMPLETED', economyStatus: actual === quote.creditPrice.value ? 'SETTLED' : 'RELEASED', content: response.content, actualUserCredits: actual, providerRequestId: (response.requestId ?? response.id) || null, usage, reused: false };
  }

  private async failProvider(runId: string, quote: Awaited<ReturnType<ExecuteQuotedRunUseCase['loadQuote']>>, reservationId: string, error: unknown): Promise<never> {
    const outcomeData = error instanceof ProviderExecutionError ? error.outcome : undefined;
    const actual = outcomeData?.billableUserCredits ?? 0n;
    if (outcomeData?.deliveryStarted && actual === 0n) {
      await this.markReconciliation(runId, 'RECONCILIATION_REQUIRED', outcomeData, outcomeUsage(outcomeData));
      throw new ExecuteQuotedRunError('RECONCILIATION_REQUIRED', 'Provider failed after delivery without billable usage', { cause: error });
    }
    if (actual > quote.creditPrice.value) {
      await this.markReconciliation(runId, 'USAGE_EXCEEDS_RESERVATION', outcomeData, outcomeUsage(outcomeData));
      throw new ExecuteQuotedRunError('USAGE_EXCEEDS_RESERVATION', 'Provider usage exceeds the reservation', { cause: error });
    }
    try {
      await this.settleAndRelease(runId, reservationId, quote.creditPrice.value, actual);
      await this.updateRun(runId, (run) => { if (outcomeData) run.recordProviderOutcome(outcome(outcomeData, outcomeUsage(outcomeData))); run.markFailed('PROVIDER_EXECUTION_FAILED'); run.markEconomyReleased(); });
    } catch (compensationError) {
      await this.markReconciliation(runId, 'RECONCILIATION_REQUIRED', outcomeData, outcomeUsage(outcomeData));
      throw new ExecuteQuotedRunError('RECONCILIATION_REQUIRED', 'Provider failed and compensation requires reconciliation', { cause: compensationError });
    }
    throw new ExecuteQuotedRunError('PROVIDER_EXECUTION_FAILED', 'Provider execution failed', { cause: error });
  }

  private async settleAndRelease(runId: string, reservationId: string, reserved: bigint, actual: bigint): Promise<void> {
    if (actual > 0n) await this.economyOperation({ kind: 'settle', input: { operationId: `run:${runId}:settle`, reservationId, credits: actual } });
    const remaining = reserved - actual;
    if (remaining > 0n) await this.economyOperation({ kind: 'release', input: { operationId: `run:${runId}:release`, reservationId, credits: remaining } });
  }

  private async markReconciliation(runId: string, code: string, response: ProviderResponse | ProviderFailureOutcome | undefined, usage: { inputTokens: number; outputTokens: number }): Promise<void> {
    await this.updateRun(runId, (run) => { if (response) run.recordProviderOutcome(outcome(response, usage)); run.markFailed(code); run.markReconciliationRequired(code); });
  }

  private async updateRun(runId: string, mutate: (run: ChatRun) => void): Promise<void> {
    await this.uowFactory.withTransaction(async (uow) => {
      const run = await uow.runs.findById(runId);
      if (!run) throw new ExecuteQuotedRunError('RECONCILIATION_REQUIRED', 'Run disappeared during execution');
      mutate(run);
      await uow.runs.save(run);
    });
  }
  private async economyOperation(operation: CreditOperation) {
    if (operation.kind === 'reserve') return this.creditOperations.reserve.execute(operation.input);
    if (operation.kind === 'settle') return this.creditOperations.settle.execute(operation.input);
    return this.creditOperations.release.execute(operation.input);
  }

  private reused(run: ChatRun): ExecuteQuotedRunOutput {
    if (run.status === 'RUNNING') throw new ExecuteQuotedRunError('RUN_ALREADY_EXECUTING', 'Run is already executing');
    if (run.status === 'COMPLETED') throw new ExecuteQuotedRunError('RUN_ALREADY_COMPLETED', 'Run already completed');
    return { runId: run.id, status: run.status, economyStatus: run.economyStatus, content: '', actualUserCredits: BigInt(run.creditsDebited), providerRequestId: run.providerRequestId, reused: true };
  }
}

function assertInput(input: ExecuteQuotedRunInput): void {
  if (!input.userId || !input.quoteId || !input.idempotencyKey || input.messages.length === 0) throw new ExecuteQuotedRunError('INVALID_INPUT', 'Run input is incomplete');
}

function errorCode(error: unknown): string {
  return error instanceof EconomyOperationError ? error.code : 'RESERVATION_FAILED';
}

function compensationCode(error: unknown): 'SETTLEMENT_FAILED' | 'RELEASE_FAILED' {
  return error instanceof EconomyOperationError && error.code === 'RELEASE_EXCEEDS_REMAINING' ? 'RELEASE_FAILED' : 'SETTLEMENT_FAILED';
}

function validateUsage(response: ProviderResponse): { inputTokens: number; outputTokens: number } {
  const usage = response.usage ?? { inputTokens: 0, outputTokens: 0 };
  if (![usage.inputTokens, usage.outputTokens].every((value) => Number.isInteger(value) && value >= 0)) throw new ExecuteQuotedRunError('PROVIDER_EXECUTION_FAILED', 'Provider returned invalid usage');
  return usage;
}

function outcome(response: ProviderResponse | ProviderFailureOutcome, usage: { inputTokens: number; outputTokens: number }): { requestId: string; inputTokens: bigint; outputTokens: bigint; costMicrousd?: bigint } {
  return { requestId: response.requestId ?? ('id' in response ? response.id : 'unknown'), inputTokens: BigInt(usage.inputTokens), outputTokens: BigInt(usage.outputTokens), costMicrousd: response.providerCostMicrousd };
}

function outcomeUsage(outcomeData: ProviderFailureOutcome | undefined): { inputTokens: number; outputTokens: number } {
  return { inputTokens: outcomeData?.inputTokens ?? 0, outputTokens: outcomeData?.outputTokens ?? 0 };
}
