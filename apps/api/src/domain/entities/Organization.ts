import { IdentityInvariantError } from '../errors/IdentityInvariantError';
import { OrganizationSlug } from '../value-objects/OrganizationSlug';

export type OrganizationKind = 'PERSONAL' | 'ADVERTISER' | 'DEVELOPER' | 'INTERNAL';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export interface OrganizationProps {
  id: string;
  name: string;
  slug: OrganizationSlug;
  kind: OrganizationKind;
  status: OrganizationStatus;
}

export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(props: OrganizationProps): Organization {
    if (!props.id.trim() || !props.name.trim()) throw new IdentityInvariantError('Organization id and name are required');
    return new Organization({ ...props });
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get slug(): OrganizationSlug { return this.props.slug; }
  get kind(): OrganizationKind { return this.props.kind; }
  get status(): OrganizationStatus { return this.props.status; }
  isActive(): boolean { return this.status === 'ACTIVE'; }
  toProps(): OrganizationProps { return { ...this.props }; }
}
