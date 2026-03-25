import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { updateCharacterSchema } from '@/server/api-schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  const body = await request.json();
  const parsed = updateCharacterSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(createAppError('BAD_REQUEST', 'Invalid payload', parsed.error.flatten()), 400);
  }

  const { userId, name } = parsed.data;

  const target = await prisma.character.findUnique({ where: { id: characterId } });
  if (!target) {
    return jsonError(createAppError('CHARACTER_NOT_FOUND', 'Character not found'), 404);
  }

  if (target.isDefault || target.userId !== userId) {
    return jsonError(createAppError('FORBIDDEN', 'Cannot edit this character'), 403);
  }

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { name },
  });

  return Response.json({ item: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const { characterId } = await params;
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return jsonError(createAppError('BAD_REQUEST', 'userId is required'), 400);
  }

  const target = await prisma.character.findUnique({ where: { id: characterId } });
  if (!target) {
    return jsonError(createAppError('CHARACTER_NOT_FOUND', 'Character not found'), 404);
  }

  if (target.isDefault || target.userId !== userId) {
    return jsonError(createAppError('FORBIDDEN', 'Cannot delete this character'), 403);
  }

  await prisma.character.delete({ where: { id: characterId } });

  return Response.json({ success: true });
}

