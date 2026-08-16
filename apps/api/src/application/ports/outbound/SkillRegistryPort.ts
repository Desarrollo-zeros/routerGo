import type { JsonObject } from '../../contracts/JsonValue.js';

export type SkillVersion = {
  skillKey: string;
  version: number;
  promptPolicy: JsonObject;
  modelPolicy: JsonObject;
  toolPolicy: JsonObject;
  safetyPolicy: JsonObject;
};

export interface SkillRegistryPort {
  register(skill: SkillVersion): void;
  resolve(skillKey: string, version: number): SkillVersion | null;
}
