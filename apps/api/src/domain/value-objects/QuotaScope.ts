export type QuotaWindowKind = '5h' | 'week' | 'month';

export interface QuotaScopeProps {
  id: string;
  kind: string;
  limits: Record<QuotaWindowKind, number>;
}

export class QuotaScope {
  constructor(private readonly props: QuotaScopeProps) {}

  get id(): string {
    return this.props.id;
  }

  get kind(): string {
    return this.props.kind;
  }

  limitFor(window: QuotaWindowKind): number {
    return this.props.limits[window];
  }

  static create(props: QuotaScopeProps): QuotaScope {
    if (!props.id) throw new Error('QuotaScope id required');
    return new QuotaScope(props);
  }
}
