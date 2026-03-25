import { EndChatResult } from '@prisma/client';

export function formatEndChatResult(row: EndChatResult) {
  return {
    sessionId: row.sessionId,
    chatSummary: row.chatSummary,
    reflectionCard: row.reflectionCard,
    structurePoints: {
      chatTheme: row.chatTheme,
      chatEmotions: row.chatEmotions,
      coreEvent: row.coreEvent,
      relationshipImpact: row.relationshipImpact,
      deepNeed: row.deepNeed,
    },
    createdAt: row.createdAt,
  };
}
