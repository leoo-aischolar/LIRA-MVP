import { MessageRole } from '@prisma/client';

export function serializeChatHistory(messages: Array<{ role: MessageRole; content: string }>): string {
  return JSON.stringify(
    messages.map((item) => ({
      role: item.role,
      content: item.content,
    })),
  );
}
