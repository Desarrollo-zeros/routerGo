import { Credits } from '../value-objects/Credits';

export interface ChatQuoteProps {
  id: string;
  userId: string;
  walletId: string;
  modelId: string;
  tier: string;
  creditPrice: Credits;
  estimatedPlatformCostMicrousd?: bigint;
  pricingVersion?: string;
  maxOutputTokens?: number;
  idempotencyKey: string;
  createdAt: Date;
  expiresAt: Date;
}

export class ChatQuote {
  constructor(private readonly props: ChatQuoteProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get walletId(): string {
    return this.props.walletId;
  }

  get modelId(): string {
    return this.props.modelId;
  }

  get creditPrice(): Credits {
    return this.props.creditPrice;
  }

  get estimatedPlatformCostMicrousd(): bigint {
    return this.props.estimatedPlatformCostMicrousd ?? 0n;
  }

  get pricingVersion(): string {
    return this.props.pricingVersion ?? 'catalog-v1';
  }

  get maxOutputTokens(): number {
    return this.props.maxOutputTokens ?? 4096;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  toProps(): ChatQuoteProps {
    return { ...this.props };
  }

  static create(props: ChatQuoteProps): ChatQuote {
    if (!props.id || !props.userId || !props.modelId) {
      throw new Error('ChatQuote required fields missing');
    }
    if (props.expiresAt <= props.createdAt) throw new Error('expiresAt must be after createdAt');
    return new ChatQuote(props);
  }
}
