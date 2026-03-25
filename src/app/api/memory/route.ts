import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return jsonError(createAppError('BAD_REQUEST', 'userId is required'), 400);
  }

  const sessions = await prisma.session.findMany({
    where: {
      userId,
      status: 'ended',
      endChatResult: {
        isNot: null,
      },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      endedAt: true,
      character: {
        select: {
          name: true,
          roleMode: true,
        },
      },
      endChatResult: {
        select: {
          chatSummary: true,
          reflectionCard: true,
          chatTheme: true,
          chatEmotions: true,
          coreEvent: true,
          relationshipImpact: true,
          deepNeed: true,
          createdAt: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
        },
        take: 1,
      },
    },
    orderBy: {
      endedAt: 'desc',
    },
    take: 20,
  });

  return Response.json({
    items: sessions.map((session) => ({
      sessionId: session.id,
      roleMode: session.character?.roleMode ?? null,
      characterName: session.character?.name ?? null,
      character: {
        name: session.character?.name ?? null,
        roleMode: session.character?.roleMode ?? null,
      },
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      endedAt: session.endedAt,
      summary: session.endChatResult?.chatSummary ?? '',
      reflectionCard: session.endChatResult?.reflectionCard ?? '',
      endChatResult: session.endChatResult
        ? {
            chatSummary: session.endChatResult.chatSummary ?? '',
            createdAt: session.endChatResult.createdAt,
          }
        : null,
      structurePoints: {
        chatTheme: session.endChatResult?.chatTheme ?? '',
        chatEmotions: session.endChatResult?.chatEmotions ?? '',
        coreEvent: session.endChatResult?.coreEvent ?? '',
        relationshipImpact: session.endChatResult?.relationshipImpact ?? '',
        deepNeed: session.endChatResult?.deepNeed ?? '',
      },
      chatHistory: session.messages,
    })),
  });
}
