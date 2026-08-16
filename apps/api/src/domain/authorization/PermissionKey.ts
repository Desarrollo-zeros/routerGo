export const PERMISSION_KEYS = [
  'users.read',
  'users.manage',
  'wallet.read',
  'wallet.adjust',
  'economy.read',
  'economy.manage',
  'runtime.read',
  'runtime.publish',
  'models.read',
  'models.manage',
  'providers.read',
  'providers.manage',
  'cms.read',
  'cms.publish',
  'campaigns.read',
  'campaigns.manage',
  'challenges.read',
  'challenges.manage',
  'challenges.publish',
  'audit.read',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}
