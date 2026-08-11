import type { QuotaWindowKind } from './QuotaScope';

export interface UsageWindowProps {
  scopeId: string;
  windowKind: QuotaWindowKind;
  used: number;
  limit: number;
  windowStart: Date;
  windowEnd: Date;
}

export class UsageWindow {
  constructor(private readonly props: UsageWindowProps) {}

  get scopeId(): string {
    return this.props.scopeId;
  }

  get windowKind(): QuotaWindowKind {
    return this.props.windowKind;
  }

  get used(): number {
    return this.props.used;
  }

  get limit(): number {
    return this.props.limit;
  }

  usageRatio(): number {
    if (this.props.limit === 0) return 0;
    return this.props.used / this.props.limit;
  }

  remaining(): number {
    return Math.max(0, this.props.limit - this.props.used);
  }

  isAtOrAbove(threshold: number): boolean {
    return this.usageRatio() >= threshold;
  }

  isExhausted(): boolean {
    return this.props.used >= this.props.limit;
  }

  toProps(): UsageWindowProps {
    return { ...this.props };
  }
}
