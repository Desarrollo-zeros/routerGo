export const TIERS = ["FREE", "STANDARD", "PREMIUM"] as const;
export type Tier = (typeof TIERS)[number];
export const GATEWAYS = ["ZEN", "GO"] as const;
export type Gateway = (typeof GATEWAYS)[number];
export type ModelId = string;
export function getModelMeta(id: string): { tier: Tier; gateway: Gateway; provider: string } | undefined {
  return undefined;
}
export const ALLOWLIST: string[] = [];
export * from "./runtime-manifest.js";
