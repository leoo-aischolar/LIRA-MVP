import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return jsonError(createAppError('BAD_REQUEST', 'userId is required'), 400);
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return jsonError(createAppError('SESSION_NOT_FOUND', 'Session not found'), 404);
  }

  if (session.userId !== userId) {
    return jsonError(createAppError('FORBIDDEN', 'Session does not belong to this user'), 403);
  }

  const items = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({
    items,
    status: session.status,
    roleMode: session.roleMode,
  });
}

