import { Organization } from './Organization';
import { User } from './User';
import { IdentityInvariantError } from '../errors/IdentityInvariantError';

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
export interface OrganizationMemberProps { id: string; userId: string; organizationId: string; status: MembershipStatus }

export class OrganizationMember {
  private constructor(private readonly props: OrganizationMemberProps) {}

  static create(props: OrganizationMemberProps): OrganizationMember {
    if (!props.id.trim() || !props.userId.trim() || !props.organizationId.trim()) {
      throw new IdentityInvariantError('Membership identifiers are required');
    }
    return new OrganizationMember({ ...props });
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get organizationId(): string { return this.props.organizationId; }
  get status(): MembershipStatus { return this.props.status; }
  isActive(): boolean { return this.status === 'ACTIVE'; }

  isActiveFor(user: User, organization: Organization): boolean {
    return this.isActive() && user.isActive() && organization.isActive()
      && this.userId === user.id && this.organizationId === organization.id;
  }

  toProps(): OrganizationMemberProps { return { ...this.props }; }
}
