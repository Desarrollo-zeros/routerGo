export interface ApiKeyHasher {
  hash(rawKey: string): string;
}
