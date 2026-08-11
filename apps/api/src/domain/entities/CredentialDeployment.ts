export type PoolKind = 'ZEN_FREE' | 'GO' | 'ZEN_PAID';

export interface CredentialDeploymentProps {
  id: string;
  gatewayId: string;
  endpointId: string;
  secretRef: string;
  quotaScopeId: string;
  poolKind: PoolKind;
  modelLogicalId: string | null;
  enabled: boolean;
  cooldownUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CredentialDeployment {
  constructor(private props: CredentialDeploymentProps) {}

  get id(): string {
    return this.props.id;
  }

  get gatewayId(): string {
    return this.props.gatewayId;
  }

  get secretRef(): string {
    return this.props.secretRef;
  }

  get quotaScopeId(): string {
    return this.props.quotaScopeId;
  }

  get poolKind(): PoolKind {
    return this.props.poolKind;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get cooldownUntil(): Date | null {
    return this.props.cooldownUntil;
  }

  isInCooldown(now: Date): boolean {
    if (!this.props.cooldownUntil) return false;
    return now.getTime() < this.props.cooldownUntil.getTime();
  }

  isEligible(now: Date): boolean {
    return this.props.enabled && !this.isInCooldown(now);
  }

  toProps(): CredentialDeploymentProps {
    return { ...this.props };
  }

  static create(props: CredentialDeploymentProps): CredentialDeployment {
    if (!props.id || !props.gatewayId || !props.secretRef) {
      throw new Error('CredentialDeployment required fields missing');
    }
    return new CredentialDeployment(props);
  }
}
