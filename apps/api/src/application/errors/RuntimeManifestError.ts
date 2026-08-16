export type RuntimeManifestErrorCode =
  | 'MANIFEST_INVALID'
  | 'VERSION_NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'NO_ACTIVE_MANIFEST'
  | 'PUBLISH_FAILED'
  | 'ROLLBACK_FAILED';

export class RuntimeManifestError extends Error {
  constructor(public readonly code: RuntimeManifestErrorCode, message: string) {
    super(message);
    this.name = 'RuntimeManifestError';
  }
}
