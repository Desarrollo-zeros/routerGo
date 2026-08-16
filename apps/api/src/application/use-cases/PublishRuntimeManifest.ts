import type { AccessDecision } from '../../domain/authorization/AccessDecision.js';
import type { IdentityContext } from '../contracts/IdentityContext.js';
import type { JsonObject } from '../contracts/JsonValue.js';
import { PrivilegedChangeService } from '../services/PrivilegedChangeService.js';
import { buildRuntimeManifest } from '../../config/RuntimeManifestBuilder.js';
import { RuntimeManifestError } from '../errors/RuntimeManifestError.js';
import type {
  PublishedRuntimeManifest, RuntimeManifestCache, RuntimeManifestChangeScope, RuntimeManifestSourceReader,
  RuntimeManifestTelemetry,
} from '../ports/outbound/RuntimeManifestPorts.js';

export interface PublishRuntimeManifestCommand {
  identity: IdentityContext;
  decision: AccessDecision;
  operationId: string;
  correlationId: string;
  expectedActiveVersion?: number;
}

export class PublishRuntimeManifest {
  constructor(
    private readonly source: RuntimeManifestSourceReader,
    private readonly privileged: PrivilegedChangeService<RuntimeManifestChangeScope>,
    private readonly cache: RuntimeManifestCache,
    private readonly telemetry: RuntimeManifestTelemetry,
  ) {}

  async execute(command: PublishRuntimeManifestCommand): Promise<PublishedRuntimeManifest> {
    const source = await this.readAndValidateSource();
    const metadata: JsonObject = { expectedActiveVersion: command.expectedActiveVersion ?? null, manifestVersion: 0, contentHash: '' };
    const eventPayload: JsonObject = { manifestVersion: 0, previousVersion: null, operationId: command.operationId, contentHash: '' };
    const snapshot = await this.privileged.execute({
      identity: command.identity, decision: command.decision, operationId: command.operationId,
      correlationId: command.correlationId, action: 'runtime.publish',
      resource: { type: 'runtime_manifest', id: 'active' }, metadata,
      event: { eventType: 'runtime.manifest.published.v1', aggregateType: 'runtime_manifest', aggregateId: 'active', payload: eventPayload },
      mutate: async (scope) => publishSnapshot({ scope, source, expected: command.expectedActiveVersion, metadata, event: eventPayload }),
    });
    await syncCache(this.cache, this.telemetry, snapshot);
    return snapshot;
  }

  private async readAndValidateSource() {
    try {
      const source = await this.source.read();
      buildRuntimeManifest(1, source);
      return source;
    } catch (error) {
      throw new RuntimeManifestError('MANIFEST_INVALID', 'Runtime manifest candidate is invalid');
    }
  }
}

type PublishSnapshotInput = {
  scope: RuntimeManifestChangeScope;
  source: Parameters<typeof buildRuntimeManifest>[1];
  expected: number | undefined;
  metadata: JsonObject;
  event: JsonObject;
};

async function publishSnapshot(input: PublishSnapshotInput): Promise<PublishedRuntimeManifest> {
  const { scope, source, expected, metadata, event } = input;
  const active = await scope.runtimeManifest.lockActiveVersion();
  if (expected !== undefined && active !== expected) throw new RuntimeManifestError('VERSION_CONFLICT', 'Active manifest version changed');
  const version = (await scope.runtimeManifest.latestVersion()) + 1;
  const manifest = buildRuntimeManifest(version, source);
  const snapshot = { version, contentHash: manifest.contentHash!, manifest };
  await scope.runtimeManifest.append(snapshot);
  await scope.runtimeManifest.activate(version);
  Object.assign(metadata, { manifestVersion: version, contentHash: snapshot.contentHash });
  Object.assign(event, { manifestVersion: version, previousVersion: active, contentHash: snapshot.contentHash });
  return snapshot;
}

async function syncCache(cache: RuntimeManifestCache, telemetry: RuntimeManifestTelemetry, snapshot: PublishedRuntimeManifest): Promise<void> {
  try {
    await cache.sync(snapshot);
  } catch (error) {
    telemetry.cacheFailure(error);
  }
}
