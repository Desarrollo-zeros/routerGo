import type { ExecutionTarget } from '../ports/outbound/ExecutionTargetPort';
import type { ProviderPort, ProviderResponse } from '../ports/outbound/provider-port';
import type { UnitOfWorkFactory } from '../ports/outbound/UnitOfWork';
import type { ExecuteQuotedRunInput, ExecuteQuotedRunOutput } from '../ports/inbound/ExecuteQuotedRunPort';
import { ExecuteQuotedRunError, ProviderExecutionError, type ProviderFailureOutcome } from '../errors/ExecuteQuotedRunError';
import type { ChatRun } from '../../domain/entities/ChatRun';

export class ExecuteFreeRun {
  constructor(private readonly uowFactory: UnitOfWorkFactory, private readonly provider: ProviderPort) {}

  async execute(input: ExecuteQuotedRunInput, runId: string, target: ExecutionTarget): Promise<ExecuteQuotedRunOutput> {
    await this.updateRun(runId, (run) => run.markRunning('UNRESERVED'));
    try {
      const response = await this.callProvider(input, target);
      const usage = validateUsage(response);
      await this.updateRun(runId, (run) => this.completeRun(run, response, usage));
      return { runId, status: 'COMPLETED', economyStatus: 'UNRESERVED', content: response.content, actualUserCredits: 0n, providerRequestId: response.requestId ?? response.id, usage, reused: false };
    } catch (error) {
      await this.updateRun(runId, (run) => this.failRun(run, error));
      throw new ExecuteQuotedRunError('PROVIDER_EXECUTION_FAILED', 'Provider execution failed', { cause: error });
    }
  }

  private async callProvider(input: ExecuteQuotedRunInput, target: ExecutionTarget): Promise<ProviderResponse> {
    const request = { model: target.providerModelId, messages: input.messages, stream: input.stream, userId: input.userId, idempotencyKey: input.idempotencyKey };
    return input.stream ? this.provider.stream(request, target.endpoint, (chunk) => input.onChunk?.({ delta: chunk.delta, done: chunk.done })) : this.provider.call(request, target.endpoint);
  }

  private completeRun(run: ChatRun, response: ProviderResponse, value: { inputTokens: number; outputTokens: number }): void {
    run.recordProviderOutcome(outcome(response, value));
    run.markCompleted();
  }

  private failRun(run: ChatRun, error: unknown): void {
    const failure = error instanceof ProviderExecutionError ? error.outcome : undefined;
    if (failure) run.recordProviderOutcome(outcome(failure, usage(failure)));
    run.markFailed('PROVIDER_EXECUTION_FAILED');
  }

  private async updateRun(runId: string, mutate: (run: ChatRun) => void): Promise<void> {
    await this.uowFactory.withTransaction(async (uow) => {
      const run = await uow.runs.findById(runId);
      if (!run) throw new ExecuteQuotedRunError('RECONCILIATION_REQUIRED', 'Run disappeared during execution');
      mutate(run);
      await uow.runs.save(run);
    });
  }
}

function validateUsage(response: ProviderResponse): { inputTokens: number; outputTokens: number } {
  const value = response.usage ?? { inputTokens: 0, outputTokens: 0 };
  if (![value.inputTokens, value.outputTokens].every((item) => Number.isInteger(item) && item >= 0)) throw new ExecuteQuotedRunError('PROVIDER_EXECUTION_FAILED', 'Provider returned invalid usage');
  return value;
}

function usage(outcome: ProviderFailureOutcome): { inputTokens: number; outputTokens: number } {
  return { inputTokens: outcome.inputTokens ?? 0, outputTokens: outcome.outputTokens ?? 0 };
}

function outcome(response: ProviderResponse | { requestId?: string; providerCostMicrousd?: bigint }, value: { inputTokens: number; outputTokens: number }) {
  return { requestId: response.requestId ?? 'unknown', inputTokens: BigInt(value.inputTokens), outputTokens: BigInt(value.outputTokens), costMicrousd: response.providerCostMicrousd };
}
