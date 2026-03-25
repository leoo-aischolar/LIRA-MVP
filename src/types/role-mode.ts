export const ROLE_MODES = [
  'Reflective_Guide',
  'Gentle_Companion',
  'Custom_Character',
] as const;

export type RoleMode = (typeof ROLE_MODES)[number];

export function isRoleMode(value: string): value is RoleMode {
  return ROLE_MODES.includes(value as RoleMode);
}
