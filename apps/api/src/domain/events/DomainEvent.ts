export type DomainEventName =
  | 'ActivityVerified'
  | 'CreditsEarned'
  | 'QuoteCreated'
  | 'RunCreated'
  | 'RunRefunded'
  | 'ManifestInvalidated';

export interface DomainEvent<T = unknown> {
  name: DomainEventName;
  aggregateId: string;
  occurredAt: Date;
  payload: T;
}

export function createEvent<T>(name: DomainEventName, aggregateId: string, payload: T): DomainEvent<T> {
  return { name, aggregateId, occurredAt: new Date(), payload };
}
