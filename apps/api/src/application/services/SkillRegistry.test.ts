import { describe, expect, it } from 'vitest';
import { SkillRegistry } from './SkillRegistry.js';
import type { SkillVersion } from '../ports/outbound/SkillRegistryPort.js';

const skill = (version = 1): SkillVersion => ({ skillKey: 'general.default', version, promptPolicy: { tone: 'plain' }, modelPolicy: {}, toolPolicy: {}, safetyPolicy: { safe: true } });

describe('SkillRegistry', () => {
  it('resolves registered versions and rejects duplicates', () => {
    const registry = new SkillRegistry();
    registry.register(skill());
    expect(registry.resolve('general.default', 1)).toMatchObject({ version: 1 });
    expect(registry.resolve('general.default', 2)).toBeNull();
    expect(() => registry.register(skill())).toThrow('DUPLICATE_SKILL_VERSION');
  });

  it('keeps nested policy data immutable', () => {
    const registry = new SkillRegistry();
    registry.register(skill());
    const resolved = registry.resolve('general.default', 1);
    expect(() => { (resolved?.promptPolicy as { tone: string }).tone = 'unsafe'; }).toThrow();
    expect(resolved?.promptPolicy.tone).toBe('plain');
  });
});
