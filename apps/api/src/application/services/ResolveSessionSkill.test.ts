import { describe, expect, it } from 'vitest';
import type { IntentClassifierPort } from '../ports/outbound/IntentClassifierPort.js';
import type { SkillVersion } from '../ports/outbound/SkillRegistryPort.js';
import { SkillRegistry } from './SkillRegistry.js';
import { ClassifyIntentWithFallback } from './ClassifyIntentWithFallback.js';
import { ResolveSessionSkill } from './ResolveSessionSkill.js';

const skill = (skillKey: string): SkillVersion => ({ skillKey, version: 1, promptPolicy: {}, modelPolicy: {}, toolPolicy: {}, safetyPolicy: {} });
const classifier = (intent: 'coding' | 'general'): IntentClassifierPort => ({ classify: async () => ({ intent, confidence: 0.9, tags: [] }) });

function resolver(intent: 'coding' | 'general', registered = true): ResolveSessionSkill {
  const registry = new SkillRegistry();
  if (registered) registry.register(skill(`${intent}.default`));
  const fallback = new ClassifyIntentWithFallback(classifier(intent), { canClassify: async () => true }, { timeoutMs: 100, minimumConfidence: 0.7, defaultIntent: 'general' });
  return new ResolveSessionSkill(fallback, registry, {
    defaultIntent: 'general',
    versions: { coding: { skillKey: 'coding.default', version: 1 }, general: { skillKey: 'general.default', version: 1 } },
  });
}

describe('ResolveSessionSkill', () => {
  it('activates the classified immutable skill without making session availability conditional on HTTP', async () => {
    const result = await resolver('coding').execute('write code');
    expect(result.coreSessionAvailable).toBe(true);
    expect(result.classification.intent).toBe('coding');
    expect(result.skill?.skillKey).toBe('coding.default');
  });

  it('keeps the core session available when the selected skill version is unavailable', async () => {
    const result = await resolver('coding', false).execute('write code');
    expect(result.coreSessionAvailable).toBe(true);
    expect(result.skill).toBeNull();
    expect(result.reason).toBe('SKILL_VERSION_UNAVAILABLE');
  });

});
