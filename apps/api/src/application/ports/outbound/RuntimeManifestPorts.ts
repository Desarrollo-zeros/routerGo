import type { RuntimeManifest, RuntimeManifestSource } from '../../../config/runtime-manifest-schemas.js';
import type { PrivilegedChangeScope } from './PrivilegedChangeUnitOfWork';

export interface PublishedRuntimeManifest {
  version: number;
  contentHash: string;
  manifest: RuntimeManifest;
}

export interface RuntimeManifestStore {
  lockActiveVersion(): Promise<number | null>;
  latestVersion(): Promise<number>;
  read(version: number): Promise<PublishedRuntimeManifest | null>;
  append(snapshot: PublishedRuntimeManifest): Promise<void>;
  activate(version: number): Promise<void>;
}

export interface RuntimeManifestChangeScope extends PrivilegedChangeScope {
  runtimeManifest: RuntimeManifestStore;
}

export interface RuntimeManifestCache {
  sync(snapshot: PublishedRuntimeManifest): Promise<void>;
}

export interface RuntimeManifestCacheReader {
  read(version: number): Promise<PublishedRuntimeManifest | null>;
}

export interface RuntimeManifestSourceReader {
  read(): Promise<RuntimeManifestSource>;
}

export interface RuntimeManifestTelemetry {
  cacheFailure(error: unknown): void;
}
