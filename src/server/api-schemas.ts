import { RoleMode } from '@prisma/client';
import { z } from 'zod';

export const roleModeSchema = z.nativeEnum(RoleMode);

export const createSessionSchema = z.object({
  userId: z.string().uuid(),
  characterId: z.string().min(1),
  roleMode: roleModeSchema,
  forceNew: z.boolean().optional(),
});

export const streamChatSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().uuid(),
  roleMode: roleModeSchema,
  message: z.string().min(1).max(5000),
});

export const endChatSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().uuid(),
});

export const createCharacterSchema = z.object({
  userId: z.string().uuid(),
  roleMode: roleModeSchema,
  name: z.string().min(1).max(32),
});

export const updateCharacterSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(32),
});
