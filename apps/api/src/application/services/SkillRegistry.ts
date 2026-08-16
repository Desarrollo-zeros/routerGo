import type { JsonObject, JsonValue } from '../contracts/JsonValue.js';
import type { SkillRegistryPort, SkillVersion } from '../ports/outbound/SkillRegistryPort.js';

export class SkillRegistry implements SkillRegistryPort {
  private readonly versions = new Map<string, SkillVersion>();

  register(skill: SkillVersion): void {
    if (!/^[a-z][a-z0-9._-]*$/.test(skill.skillKey) || !Number.isSafeInteger(skill.version) || skill.version < 1) throw new Error('INVALID_SKILL_VERSION');
    const key = `${skill.skillKey}:${skill.version}`;
    if (this.versions.has(key)) throw new Error('DUPLICATE_SKILL_VERSION');
    this.versions.set(key, freezeSkill(skill));
  }

  resolve(skillKey: string, version: number): SkillVersion | null {
    return this.versions.get(`${skillKey}:${version}`) ?? null;
  }
}

function freezeSkill(skill: SkillVersion): SkillVersion {
  return Object.freeze({ ...skill, promptPolicy: freezeJson(skill.promptPolicy), modelPolicy: freezeJson(skill.modelPolicy), toolPolicy: freezeJson(skill.toolPolicy), safetyPolicy: freezeJson(skill.safetyPolicy) });
}

function freezeJson(value: JsonObject): JsonObject {
  for (const item of Object.values(value)) freezeValue(item);
  return Object.freeze(value);
}

function freezeValue(value: JsonValue): void {
  if (Array.isArray(value)) { value.forEach(freezeValue); Object.freeze(value); return; }
  if (value && typeof value === 'object') freezeJson(value);
}
