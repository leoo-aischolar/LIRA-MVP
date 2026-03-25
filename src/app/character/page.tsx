'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchJson } from '@/lib/api-client';
import { useAppStore } from '@/store/app-store';
import { RoleMode } from '@/types/role-mode';

type CharacterItem = {
  id: string;
  name: string;
  roleMode: RoleMode;
  isDefault: boolean;
};

type CharacterResponse = {
  items: CharacterItem[];
};

type SessionResponse = {
  sessionId: string;
  reused: boolean;
  cozeConversationId: string;
};

export default function CharacterPage() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const selectedRoleMode = useAppStore((state) => state.selectedRoleMode);
  const setCurrentSessionId = useAppStore((state) => state.setCurrentSessionId);

  const [items, setItems] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const canCreate = useMemo(() => newName.trim().length > 0, [newName]);

  async function loadCharacters() {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchJson<CharacterResponse>(
        `/api/characters?roleMode=${encodeURIComponent(selectedRoleMode)}&userId=${encodeURIComponent(userId)}`,
      );
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '角色加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCharacters().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedRoleMode]);

  async function handleCreateCharacter() {
    if (!userId || !canCreate || creating) {
      return;
    }

    setCreating(true);
    setError('');
    try {
      await fetchJson('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          roleMode: selectedRoleMode,
          name: newName.trim(),
        }),
      });

      setNewName('');
      await loadCharacters();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : '创建角色失败');
    } finally {
      setCreating(false);
    }
  }

  async function handleStartChat(characterId: string, characterName: string) {
    if (!userId) {
      return;
    }

    setError('');
    try {
      const data = await fetchJson<SessionResponse>('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          characterId,
          roleMode: selectedRoleMode,
          forceNew: false,
        }),
      });

      setCurrentSessionId(data.sessionId);
      const query = new URLSearchParams({
        roleMode: selectedRoleMode,
        characterId,
        characterName,
      });
      router.push(`/chat/${data.sessionId}?${query.toString()}`);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : '会话创建失败');
    }
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-lira-text">选择角色</h1>
        <Link href="/chat-mode" className="text-sm text-lira-subtext">
          返回模式
        </Link>
      </div>

      <p className="mt-2 text-sm text-lira-subtext">当前模式：{selectedRoleMode}</p>

      <div className="mt-6 rounded-2xl border border-[#e1d7cd] bg-lira-card p-4">
        <p className="text-sm font-medium text-lira-text">创建新角色</p>
        <div className="mt-3 flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="输入角色名称"
            className="w-full rounded-xl border border-[#dccfc2] bg-white px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => {
              handleCreateCharacter().catch(() => undefined);
            }}
            disabled={!canCreate || creating}
            className="rounded-xl bg-lira-accent px-3 py-2 text-sm font-semibold text-white"
          >
            {creating ? '创建中' : '创建'}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {loading ? <p className="text-sm text-lira-subtext">加载角色中...</p> : null}
        {!loading && items.length === 0 ? <p className="text-sm text-lira-subtext">暂无角色，先创建一个。</p> : null}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              handleStartChat(item.id, item.name).catch(() => undefined);
            }}
            className="w-full rounded-2xl border border-[#e3d9cf] bg-white p-4 text-left"
          >
            <p className="font-semibold text-lira-text">{item.name}</p>
            <p className="mt-1 text-xs text-lira-subtext">{item.isDefault ? '默认角色' : '自定义角色'}</p>
          </button>
        ))}
      </div>
    </main>
  );
}
