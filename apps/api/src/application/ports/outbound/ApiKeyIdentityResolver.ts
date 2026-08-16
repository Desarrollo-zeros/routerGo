import type { IdentityContext } from '../../contracts/IdentityContext.js';
import type { ApiKeyRequestContext } from './ApiKeyContextResolver.js';

export interface ApiKeyIdentityResolver {
  resolve(context: ApiKeyRequestContext): Promise<IdentityContext | null>;
}
