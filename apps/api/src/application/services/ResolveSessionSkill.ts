import type { Intent, IntentClassification } from '../ports/outbound/IntentClassifierPort.js';
import type { SkillRegistryPort, SkillVersion } from '../ports/outbound/SkillRegistryPort.js';
import type { ClassifyIntentWithFallback } from './ClassifyIntentWithFallback.js';

type SkillReference = { skillKey: string; version: number };
type SessionSkillConfig = { defaultIntent: Intent; versions: Partial<Record<Intent, SkillReference>> };

export type SessionSkillResolution = {
  coreSessionAvailable: true;
  classification: IntentClassification;
  skill: SkillVersion | null;
  reason: 'SKILL_SELECTED' | 'SKILL_VERSION_UNAVAILABLE';
};

export class ResolveSessionSkill {
  constructor(private readonly classifier: ClassifyIntentWithFallback, private readonly registry: SkillRegistryPort, private readonly config: SessionSkillConfig) {}

  async execute(features: string): Promise<SessionSkillResolution> {
    const classification = await this.classifier.execute(features);
    const skill = resolveSkill(classification.intent, this.config, this.registry);
    return { coreSessionAvailable: true, classification, skill, reason: skill ? 'SKILL_SELECTED' : 'SKILL_VERSION_UNAVAILABLE' };
  }
}

function resolveSkill(intent: Intent, config: SessionSkillConfig, registry: SkillRegistryPort): SkillVersion | null {
  const reference = config.versions[intent] ?? config.versions[config.defaultIntent];
  return reference ? registry.resolve(reference.skillKey, reference.version) : null;
}
