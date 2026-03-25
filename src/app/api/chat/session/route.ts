import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { createSessionSchema } from '@/server/api-schemas';
import { createCozeConversation } from '@/server/coze';

export async function POST(request: NextRequest) {
  let requestBodyForLog: unknown = null;
  let parsedDataForLog: unknown = null;

  try {
    const body = await request.json();
    requestBodyForLog = body;
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(createAppError('BAD_REQUEST', 'Invalid request payload', parsed.error.flatten()), 400);
    }

    parsedDataForLog = parsed.data;
    const { userId, characterId, roleMode, forceNew } = parsed.data;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    const character = await prisma.character.findUnique({ where: { id: characterId } });

    if (!character) {
      return jsonError(createAppError('CHARACTER_NOT_FOUND', 'Character does not exist'), 404);
    }

    if (character.roleMode !== roleMode) {
      return jsonError(createAppError('INVALID_ROLE_MODE', 'Role mode does not match character'), 400);
    }

    if (!forceNew) {
      const activeSession = await prisma.session.findFirst({
        where: {
          userId,
          characterId,
          roleMode,
          status: 'active',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSession) {
        return Response.json({
          sessionId: activeSession.id,
          cozeConversationId: activeSession.cozeConversationId,
          reused: true,
        });
      }
    }

    const cozeConversationId = await createCozeConversation();

    const session = await prisma.session.create({
      data: {
        id: randomUUID(),
        userId,
        characterId,
        roleMode,
        cozeConversationId,
        status: 'active',
      },
    });

    return Response.json({
      sessionId: session.id,
      cozeConversationId,
      reused: false,
    });
  } catch (error) {
    const err = error as {
      name?: string;
      message?: string;
      stack?: string;
      code?: string;
      cause?: unknown;
      detail?: unknown;
    };

    console.error('[Session API Error Details]:', {
      timestamp: new Date().toISOString(),
      route: '/api/chat/session',
      method: 'POST',
      requestBody: requestBodyForLog,
      parsedData: parsedDataForLog,
      errorName: err?.name,
      errorCode: err?.code,
      errorMessage: err?.message,
      errorCause: err?.cause,
      errorDetail: err?.detail,
    });
    console.error('[Session API Error Stack]:', err?.stack ?? error);

    return jsonError(createAppError('SESSION_CREATE_FAILED', 'Failed to create session', error), 500);
  }
}
