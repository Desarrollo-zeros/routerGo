export type ChatRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

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

  canRefund(): boolean {
    return this.props.status === 'FAILED' || this.props.status === 'PENDING';
  }

  markRunning(): void {
    this.props.status = 'RUNNING';
    this.props.updatedAt = new Date();
  }

  markCompleted(): void {
    this.props.status = 'COMPLETED';
    this.props.completedAt = new Date();
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
