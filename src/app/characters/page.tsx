'use client';

import { Inter } from 'next/font/google';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api-client';
import { useAppStore } from '@/store/app-store';
import { RoleMode } from '@/types/role-mode';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

type DisplayCharacter = {
  id: string;
  name: string;
  desc: string;
  roleMode?: string;
};

type ModeConfig = {
  modeName: string;
  normalizedRoleMode: RoleMode;
  defaultChar: DisplayCharacter;
};

const modeMap: Record<string, ModeConfig> = {
  Reflective_Guide: {
    modeName: '照见',
    normalizedRoleMode: 'Reflective_Guide',
    defaultChar: {
      id: 'default_1',
      name: '思引',
      desc: '默认角色: 向内探索，帮你读懂自己的真实想法',
    },
  },
  Warm_Listener: {
    modeName: '相伴',
    normalizedRoleMode: 'Gentle_Companion',
    defaultChar: {
      id: 'default_2',
      name: '心伴',
      desc: '默认角色: 温柔相守，倾听你每一份情绪与心事',
    },
  },
  Gentle_Companion: {
    modeName: '相伴',
    normalizedRoleMode: 'Gentle_Companion',
    defaultChar: {
      id: 'default_2',
      name: '心伴',
      desc: '默认角色: 温柔相守，倾听你每一份情绪与心事',
    },
  },
  Custom: {
    modeName: '心选',
    normalizedRoleMode: 'Custom_Character',
    defaultChar: {
      id: 'default_3',
      name: '万相',
      desc: '默认角色: 随心塑造，定义你的专属角色',
    },
  },
  Custom_Character: {
    modeName: '心选',
    normalizedRoleMode: 'Custom_Character',
    defaultChar: {
      id: 'default_3',
      name: '万相',
      desc: '默认角色: 随心塑造，定义你的专属角色',
    },
  },
};

const CUSTOM_CHARS_STORAGE_KEY = 'lira_custom_chars';

type CharacterItem = {
  id: string;
  isDefault: boolean;
};

type CharacterResponse = {
  items: CharacterItem[];
};

type SessionResponse = {
  sessionId: string;
};

function normalizeRoleModeValue(roleMode?: string | null): string {
  const normalized = (roleMode ?? '').trim();
  if (normalized === 'Warm_Listener') {
    return 'Gentle_Companion';
  }
  if (normalized === 'Custom') {
    return 'Custom_Character';
  }
  return normalized;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '进入对话失败，请稍后重试。';
}

function CharactersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleModeParam = searchParams.get('roleMode') ?? 'Reflective_Guide';

  const userId = useAppStore((state) => state.userId);
  const setCurrentSessionId = useAppStore((state) => state.setCurrentSessionId);
  const setSelectedRoleMode = useAppStore((state) => state.setSelectedRoleMode);

  const [isMounted, setIsMounted] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [customChars, setCustomChars] = useState<DisplayCharacter[]>([]);

  const modeConfig = useMemo(() => modeMap[roleModeParam] ?? modeMap.Reflective_Guide, [roleModeParam]);
  const currentRoleMode = roleModeParam;
  const normalizedCurrentRoleMode = useMemo(
    () => normalizeRoleModeValue(currentRoleMode || modeConfig.normalizedRoleMode),
    [currentRoleMode, modeConfig.normalizedRoleMode],
  );

  const cards = useMemo(
    () => [modeConfig.defaultChar, ...customChars],
    [customChars, modeConfig.defaultChar],
  );

  useEffect(() => {
    setSelectedRoleMode(modeConfig.normalizedRoleMode);
  }, [modeConfig.normalizedRoleMode, setSelectedRoleMode]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CUSTOM_CHARS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        setCustomChars([]);
        return;
      }

      const filtered = parsed.filter((item) => {
        if (typeof item !== 'object' || item === null) {
          return false;
        }

        if (typeof (item as { roleMode?: unknown }).roleMode !== 'string') {
          return false;
        }

        const itemRoleMode = normalizeRoleModeValue((item as { roleMode: string }).roleMode);
        return (
          itemRoleMode === normalizedCurrentRoleMode ||
          (item as { roleMode: string }).roleMode === currentRoleMode
        );
      });

      const normalized = filtered
        .filter((item): item is { id: string; name: string; desc: string; roleMode?: string } => {
          return (
            typeof item === 'object' &&
            item !== null &&
            typeof (item as { id?: unknown }).id === 'string' &&
            typeof (item as { name?: unknown }).name === 'string' &&
            typeof (item as { desc?: unknown }).desc === 'string'
          );
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          desc: item.desc,
          roleMode: item.roleMode,
        }));

      setCustomChars(normalized);
    } catch (loadError) {
      console.error('Failed to load characters:', loadError);
      setCustomChars([]);
    }
  }, [currentRoleMode, isMounted, normalizedCurrentRoleMode]);

  async function handleEnterChat(card: DisplayCharacter) {
    if (!userId || submittingId) {
      return;
    }

    setSubmittingId(card.id);
    setError('');

    try {
      const characterData = await fetchJson<CharacterResponse>(
        `/api/characters?roleMode=${encodeURIComponent(modeConfig.normalizedRoleMode)}&userId=${encodeURIComponent(userId)}`,
      );

      const targetCharacter =
        card.id === modeConfig.defaultChar.id
          ? characterData.items.find((item) => item.isDefault) ?? characterData.items[0]
          : characterData.items.find((item) => !item.isDefault) ?? characterData.items[0];

      if (!targetCharacter) {
        throw new Error('当前模式还没有可用角色。');
      }

      const sessionData = await fetchJson<SessionResponse>('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          characterId: targetCharacter.id,
          roleMode: modeConfig.normalizedRoleMode,
          forceNew: false,
        }),
      });

      setCurrentSessionId(sessionData.sessionId);
      const query = new URLSearchParams({
        roleMode: currentRoleMode,
        characterId: card.id,
        characterName: card.name,
      });
      router.push(`/chat/${sessionData.sessionId}?${query.toString()}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmittingId(null);
    }
  }

  if (!isMounted) {
    return null;
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3]">
      <header className="relative flex items-start justify-between px-6 pb-8 pt-10">
        <button
          type="button"
          onClick={() => router.push('/chat-mode')}
          className={`${inter.className} text-base text-black/50`}
        >
          返回模式
        </button>

        <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center">
          <h1 className="text-2xl font-normal text-[#5E5A48]">选择角色</h1>
          <p className="mt-1 text-xl font-bold text-black/50">{modeConfig.modeName}</p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/create-character?roleMode=${encodeURIComponent(currentRoleMode)}`)}
          className={`${inter.className} cursor-pointer text-base text-black/50 transition-colors hover:text-black/80`}
        >
          创建角色
        </button>
      </header>

      <section className="mt-6 px-6">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              handleEnterChat(card).catch(() => undefined);
            }}
            disabled={Boolean(submittingId)}
            className="animate-fade-in-up mb-5 w-full translate-y-6 rounded-2xl bg-[#C9FFEF] p-6 text-left opacity-0"
          >
            <p className="mb-2 text-2xl font-normal text-[#5E5A48]">{card.name}</p>
            <p className="text-sm text-black/30">{card.desc}</p>
          </button>
        ))}

        {error ? <p className="mt-2 text-sm text-[#A24C47]">{error}</p> : null}
      </section>
    </main>
  );
}

export default function CharactersPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3]" />}>
      <CharactersPageContent />
    </Suspense>
  );
}
