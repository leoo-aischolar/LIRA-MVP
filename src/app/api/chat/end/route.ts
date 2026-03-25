import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { endChatSchema } from '@/server/api-schemas';
import { serializeChatHistory } from '@/server/chat-history';
import { formatEndChatResult } from '@/server/end-chat-result';
import { runCozeEndChatWorkflow } from '@/server/coze';
import { parseEndChatWorkflowResult } from '@/server/workflow-parser';

async function acquireEndChatLock(sessionId: string, requestId: string): Promise<boolean> {
  const lockUntil = new Date(Date.now() + 2 * 60 * 1000);

  try {
    await prisma.endChatLock.create({
      data: {
        sessionId,
        requestId,
        lockUntil,
      },
    });

    return true;
  } catch {
    const takeover = await prisma.endChatLock.updateMany({
      where: {
        sessionId,
        lockUntil: {
          lt: new Date(),
        },
      },
      data: {
        requestId,
        lockUntil,
      },
    });

    return takeover.count === 1;
  }
}

async function releaseEndChatLock(sessionId: string, requestId: string): Promise<void> {
  await prisma.endChatLock.deleteMany({
    where: {
      sessionId,
      requestId,
    },
  });
}

export async function POST(request: NextRequest) {
  let lockContext: { sessionId: string; requestId: string } | null = null;

  try {
    const body = await request.json();
    const parsed = endChatSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(createAppError('BAD_REQUEST', 'Invalid request payload', parsed.error.flatten()), 400);
    }

    const { sessionId, userId } = parsed.data;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      return jsonError(createAppError('SESSION_NOT_FOUND', 'Session does not exist'), 404);
    }

    if (session.userId !== userId) {
      return jsonError(createAppError('INVALID_USER', 'Session does not belong to this user'), 403);
    }

    const existingResult = await prisma.endChatResult.findUnique({ where: { sessionId } });
    if (existingResult) {
      if (session.status !== 'ended') {
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'ended', endedAt: new Date() },
        });
      }
      return Response.json(formatEndChatResult(existingResult));
    }

    if (session.status === 'ended') {
      return jsonError(createAppError('END_CHAT_RESULT_MISSING', 'Session already ended but result is missing'), 409);
    }

    const requestId = randomUUID();
    const acquired = await acquireEndChatLock(sessionId, requestId);

    if (!acquired) {
      const winnerResult = await prisma.endChatResult.findUnique({ where: { sessionId } });
      if (winnerResult) {
        return Response.json(formatEndChatResult(winnerResult));
      }

      return jsonError(
        createAppError('END_CHAT_IN_PROGRESS', 'End chat is processing for this session. Please retry shortly.'),
        409,
      );
    }

    lockContext = { sessionId, requestId };

    const latestResult = await prisma.endChatResult.findUnique({ where: { sessionId } });
    if (latestResult) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date() },
      });
      return Response.json(formatEndChatResult(latestResult));
    }

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    if (messages.length === 0) {
      return jsonError(createAppError('INVALID_CHAT_HISTORY', 'No messages found for this session'), 400);
    }

    const chatHistory = serializeChatHistory(messages);
    console.log('[End Chat] messages count:', messages.length);
    console.log('[End Chat] chat_history length:', chatHistory.length);
    console.log('[End Chat] chat_history content:', chatHistory);

    const workflow_response_data = await runCozeEndChatWorkflow({
      roleMode: session.roleMode,
      chatHistory,
      userId,
    });
    console.log('[Workflow Raw Data]:', JSON.stringify(workflow_response_data));

    const workflowResult = parseEndChatWorkflowResult(workflow_response_data);

    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.endChatResult.upsert({
        where: { sessionId },
        create: {
          sessionId,
          chatSummary: workflowResult.chatSummary,
          reflectionCard: workflowResult.reflectionCard,
          chatTheme: workflowResult.structurePoints.chatTheme,
          chatEmotions: workflowResult.structurePoints.chatEmotions,
          coreEvent: workflowResult.structurePoints.coreEvent,
          relationshipImpact: workflowResult.structurePoints.relationshipImpact,
          deepNeed: workflowResult.structurePoints.deepNeed,
          rawJson: workflowResult.raw === undefined ? undefined : (workflowResult.raw as never),
        },
        update: {
          chatSummary: workflowResult.chatSummary,
          reflectionCard: workflowResult.reflectionCard,
          chatTheme: workflowResult.structurePoints.chatTheme,
          chatEmotions: workflowResult.structurePoints.chatEmotions,
          coreEvent: workflowResult.structurePoints.coreEvent,
          relationshipImpact: workflowResult.structurePoints.relationshipImpact,
          deepNeed: workflowResult.structurePoints.deepNeed,
          rawJson: workflowResult.raw === undefined ? undefined : (workflowResult.raw as never),
        },
      });

      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
        },
      });

      return row;
    });

    return Response.json(formatEndChatResult(saved));
  } catch (error) {
    return jsonError(createAppError('COZE_WORKFLOW_PARSE_FAILED', 'Failed to finish chat', error), 500);
  } finally {
    if (lockContext) {
      try {
        await releaseEndChatLock(lockContext.sessionId, lockContext.requestId);
      } catch (releaseError) {
        console.error('end chat lock release failed', releaseError);
      }
    }
  }
}
