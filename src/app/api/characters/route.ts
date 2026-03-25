import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { createCharacterSchema } from '@/server/api-schemas';
import { isRoleMode } from '@/types/role-mode';

export async function GET(request: NextRequest) {
  const roleMode = request.nextUrl.searchParams.get('roleMode');
  const userId = request.nextUrl.searchParams.get('userId');

  if (roleMode && !isRoleMode(roleMode)) {
    return jsonError(createAppError('INVALID_ROLE_MODE', 'Invalid role mode'), 400);
  }

  const items = await prisma.character.findMany({
    where: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(roleMode ? { roleMode: roleMode as any } : {}),
      OR: [{ isDefault: true }, ...(userId ? [{ userId }] : [])],
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createCharacterSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(createAppError('BAD_REQUEST', 'Invalid payload', parsed.error.flatten()), 400);
  }

  const { userId, roleMode, name } = parsed.data;

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  });

  const created = await prisma.character.create({
    data: {
      slug: `custom-${randomUUID()}`,
      name,
      roleMode,
      isDefault: false,
      userId,
    },
  });

  return Response.json({ item: created });
}
