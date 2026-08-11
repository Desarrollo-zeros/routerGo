import { Credits } from '../value-objects/Credits';

export interface WalletProps {
  id: string;
  userId: string;
  balance: Credits;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  constructor(private props: WalletProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get balance(): Credits {
    return this.props.balance;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  canDebit(amount: Credits): boolean {
    return this.props.balance.gte(amount);
  }

  credit(amount: Credits): void {
    this.props.balance = this.props.balance.add(amount);
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  debit(amount: Credits): void {
    const next = this.props.balance.subtract(amount);
    if (next.isNegative()) throw new Error('InsufficientBalance');
    this.props.balance = next;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  toProps(): WalletProps {
    return { ...this.props };
  }

  static create(props: WalletProps): Wallet {
    if (!props.id || !props.userId) throw new Error('Wallet id/userId required');
    if (props.balance.isNegative()) throw new Error('balance must be >=0');
    return new Wallet(props);
  }
}
