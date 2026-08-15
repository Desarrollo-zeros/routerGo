import type { Organization } from '../../../domain/entities/Organization';

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
}
