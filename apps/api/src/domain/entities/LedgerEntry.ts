import { Credits } from '../value-objects/Credits';

export type LedgerKind = 'earn' | 'spend' | 'refund';

export interface LedgerEntryProps {
  id: string;
  walletId: string;
  kind: LedgerKind;
  amount: Credits;
  idempotencyKey: string;
  refId: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

export class LedgerEntry {
  constructor(private readonly props: LedgerEntryProps) {}

  get id(): string {
    return this.props.id;
  }

  get walletId(): string {
    return this.props.walletId;
  }

  get kind(): LedgerKind {
    return this.props.kind;
  }

  get amount(): Credits {
    return this.props.amount;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get refId(): string | null {
    return this.props.refId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isEarn(): boolean {
    return this.props.kind === 'earn';
  }

  isSpend(): boolean {
    return this.props.kind === 'spend';
  }

  isRefund(): boolean {
    return this.props.kind === 'refund';
  }

  toProps(): LedgerEntryProps {
    return { ...this.props };
  }

  static create(props: LedgerEntryProps): LedgerEntry {
    if (!props.id || !props.walletId || !props.idempotencyKey) {
      throw new Error('LedgerEntry required fields missing');
    }
    if (props.amount.isNegative() || props.amount.isZero()) {
      throw new Error('amount must be >0');
    }
    return new LedgerEntry(props);
  }
}
