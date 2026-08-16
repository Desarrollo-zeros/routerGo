export type ChatRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type RunEconomyStatus = 'UNRESERVED' | 'RESERVED' | 'SETTLED' | 'RELEASED' | 'RECONCILIATION_REQUIRED';

export interface ChatRunProps {
  id: string;
  quoteId: string;
  userId: string;
  walletId: string;
  modelId: string;
  status: ChatRunStatus;
  creditsDebited: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  errorCode?: string | null;
  economyStatus?: RunEconomyStatus;
  reservationId?: string | null;
  providerRequestId?: string | null;
  inputTokens?: bigint;
  outputTokens?: bigint;
  providerCostMicrousd?: bigint;
}

export class ChatRun {
  constructor(private props: ChatRunProps) {}

  get id(): string {
    return this.props.id;
  }

  get quoteId(): string {
    return this.props.quoteId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get walletId(): string {
    return this.props.walletId;
  }

  get status(): ChatRunStatus {
    return this.props.status;
  }

  get creditsDebited(): string {
    return this.props.creditsDebited;
  }

  get economyStatus(): RunEconomyStatus { return this.props.economyStatus ?? 'UNRESERVED'; }
  get reservationId(): string | null { return this.props.reservationId ?? null; }
  get providerRequestId(): string | null { return this.props.providerRequestId ?? null; }
  get inputTokens(): bigint { return this.props.inputTokens ?? 0n; }
  get outputTokens(): bigint { return this.props.outputTokens ?? 0n; }
  get providerCostMicrousd(): bigint { return this.props.providerCostMicrousd ?? 0n; }

  canRefund(): boolean {
    return this.props.status === 'FAILED' || this.props.status === 'PENDING';
  }

  markRunning(): void {
    this.props.status = 'RUNNING';
    this.props.economyStatus = 'RESERVED';
    this.props.updatedAt = new Date();
  }

  markReserved(reservationId: string): void {
    this.props.reservationId = reservationId;
    this.props.economyStatus = 'RESERVED';
    this.props.updatedAt = new Date();
  }

  recordProviderOutcome(input: { requestId: string; inputTokens: bigint; outputTokens: bigint; costMicrousd?: bigint }): void {
    this.props.providerRequestId = input.requestId;
    this.props.inputTokens = input.inputTokens;
    this.props.outputTokens = input.outputTokens;
    this.props.providerCostMicrousd = input.costMicrousd ?? 0n;
    this.props.updatedAt = new Date();
  }

  markCompleted(): void {
    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markEconomySettled(): void {
    this.props.economyStatus = 'SETTLED';
    this.props.updatedAt = new Date();
  }

  markEconomyReleased(): void {
    this.props.economyStatus = 'RELEASED';
    this.props.updatedAt = new Date();
  }

  markReconciliationRequired(code: string): void {
    this.props.economyStatus = 'RECONCILIATION_REQUIRED';
    this.props.errorCode = code;
    this.props.updatedAt = new Date();
  }

  markFailed(code: string): void {
    this.props.status = 'FAILED';
    this.props.errorCode = code;
    this.props.updatedAt = new Date();
  }

  markRefunded(): void {
    this.props.status = 'REFUNDED';
    this.props.updatedAt = new Date();
  }

  toProps(): ChatRunProps {
    return { ...this.props };
  }

  static create(props: ChatRunProps): ChatRun {
    if (!props.id || !props.quoteId) throw new Error('ChatRun id/quoteId required');
    return new ChatRun(props);
  }
}
