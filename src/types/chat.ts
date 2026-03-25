import { RoleMode } from '@/types/role-mode';

export const ROLE_MODE_VALUES: RoleMode[] = [
  'Reflective_Guide',
  'Gentle_Companion',
  'Custom_Character',
];

export type StreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'complete' }
  | { type: 'follow_up'; items: string[] }
  | { type: 'error'; code: string; message: string };

export type EndChatWorkflowResult = {
  chatSummary: string;
  reflectionCard: string;
  structurePoints: {
    chatTheme: string;
    chatEmotions: string;
    coreEvent: string;
    relationshipImpact: string;
    deepNeed: string;
  };
  raw?: unknown;
};
