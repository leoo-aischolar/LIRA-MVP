import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { formatEndChatResult } from '@/server/end-chat-result';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return jsonError(createAppError('BAD_REQUEST', 'sessionId is required'), 400);
  }

  const result = await prisma.endChatResult.findUnique({ where: { sessionId } });

  if (!result) {
    return jsonError(createAppError('END_CHAT_RESULT_NOT_FOUND', 'No end chat result for this session'), 404);
  }

  return Response.json(formatEndChatResult(result));
}
