import type { ApiQuotaPort, CheckApiQuotaInput, CheckApiQuotaOutput } from '../ports/inbound/ApiQuotaPort';
import type { ApiQuotaCounter } from '../ports/outbound/ApiQuotaCounter';
import type { ApiQuotaRepository } from '../ports/outbound/ApiQuotaRepository';

export interface CheckApiQuotaDependencies {
  policies: ApiQuotaRepository;
  counter: ApiQuotaCounter;
}

export class CheckApiQuotaUseCase implements ApiQuotaPort {
  constructor(private readonly dependencies: CheckApiQuotaDependencies) {}

  async check(input: CheckApiQuotaInput): Promise<CheckApiQuotaOutput> {
    validateInput(input);
    const policies = await this.dependencies.policies.findEnabled(input);
    return this.dependencies.counter.consume(policies, { requests: 1, tokens: input.inputTokens + input.outputTokens, credits: input.credits });
  }
}

function validateInput(input: CheckApiQuotaInput): void {
  if (!input.clientId || !input.keyId || !input.model || input.inputTokens < 0 || input.outputTokens < 0 || input.credits < 0n) throw new Error('InvalidApiQuotaInput');
}
