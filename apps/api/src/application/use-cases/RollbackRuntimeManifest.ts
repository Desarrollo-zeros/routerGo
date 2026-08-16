import type { AccessDecision } from '../../domain/authorization/AccessDecision.js';
import type { IdentityContext } from '../contracts/IdentityContext.js';
import type { JsonObject } from '../contracts/JsonValue.js';
import { PrivilegedChangeService } from '../services/PrivilegedChangeService.js';
import { RuntimeManifestError } from '../errors/RuntimeManifestError.js';
import type {
  PublishedRuntimeManifest, RuntimeManifestCache, RuntimeManifestChangeScope, RuntimeManifestTelemetry,
} from '../ports/outbound/RuntimeManifestPorts.js';

export interface RollbackRuntimeManifestCommand {
  identity: IdentityContext;
  decision: AccessDecision;
  operationId: string;
  correlationId: string;
  targetVersion: number;
  expectedActiveVersion?: number;
}

export class RollbackRuntimeManifest {
  constructor(
    private readonly privileged: PrivilegedChangeService<RuntimeManifestChangeScope>,
    private readonly cache: RuntimeManifestCache,
    private readonly telemetry: RuntimeManifestTelemetry,
  ) {}

  async execute(command: RollbackRuntimeManifestCommand): Promise<PublishedRuntimeManifest> {
    const metadata: JsonObject = {
      expectedActiveVersion: command.expectedActiveVersion ?? null,
      targetVersion: command.targetVersion,
    };
    const eventPayload: JsonObject = { manifestVersion: command.targetVersion, previousVersion: null, operationId: command.operationId };
    const snapshot = await this.privileged.execute({
      identity: command.identity, decision: command.decision, operationId: command.operationId,
      correlationId: command.correlationId, action: 'runtime.rollback',
      resource: { type: 'runtime_manifest', id: 'active' }, metadata,
      event: { eventType: 'runtime.manifest.rolled_back.v1', aggregateType: 'runtime_manifest', aggregateId: 'active', payload: eventPayload },
      mutate: async (scope) => rollbackSnapshot(scope, command, metadata, eventPayload),
    });
    await syncCache(this.cache, this.telemetry, snapshot);
    return snapshot;
  }
}

async function rollbackSnapshot(
  scope: RuntimeManifestChangeScope,
  command: RollbackRuntimeManifestCommand,
  metadata: JsonObject,
  event: JsonObject,
): Promise<PublishedRuntimeManifest> {
  const active = await scope.runtimeManifest.lockActiveVersion();
  if (command.expectedActiveVersion !== undefined && active !== command.expectedActiveVersion) {
    throw new RuntimeManifestError('VERSION_CONFLICT', 'Active manifest version changed');
  }
  const snapshot = await scope.runtimeManifest.read(command.targetVersion);
  if (!snapshot) throw new RuntimeManifestError('VERSION_NOT_FOUND', `Manifest version ${command.targetVersion} not found`);
  await scope.runtimeManifest.activate(snapshot.version);
  Object.assign(metadata, { previousVersion: active, contentHash: snapshot.contentHash });
  Object.assign(event, { previousVersion: active, contentHash: snapshot.contentHash });
  return snapshot;
}

async function syncCache(cache: RuntimeManifestCache, telemetry: RuntimeManifestTelemetry, snapshot: PublishedRuntimeManifest): Promise<void> {
  try {
    await cache.sync(snapshot);
  } catch (error) {
    telemetry.cacheFailure(error);
  }
}
