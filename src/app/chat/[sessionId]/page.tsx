'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api-client';
import { useAppStore } from '@/store/app-store';
import { RoleMode } from '@/types/role-mode';

type MessageItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
};

type SessionMessagesResponse = {
  items: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }>;
  status: 'active' | 'ended';
  roleMode: RoleMode;
};

type EndChatResultResponse = {
  sessionId: string;
  chatSummary: string;
  reflectionCard: string;
  structurePoints: {
    chatTheme: string;
    chatEmotions: string;
    coreEvent: string;
    relationshipImpact: string;
    deepNeed: string;
  };
};

const ROLE_NAME_MAP: Record<RoleMode, string> = {
  Reflective_Guide: '思引',
  Gentle_Companion: '心伴',
  Custom_Character: '万相',
};

function parseSseBlock(block: string): unknown | null {
  const lines = block.split(/\r?\n/);
  const dataLine = lines.find((line) => line.startsWith('data:'));
  if (!dataLine) {
    return null;
  }

  const raw = dataLine.slice(5).trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function waitForEndResult(sessionId: string): Promise<EndChatResultResponse> {
  for (let i = 0; i < 20; i += 1) {
    const response = await fetch(`/api/chat/end-result?sessionId=${encodeURIComponent(sessionId)}`);
    if (response.ok) {
      return (await response.json()) as EndChatResultResponse;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  throw new Error('沉淀处理中，请稍后重试');
}

function ChatPageContent() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = useAppStore((state) => state.userId);
  const selectedRoleMode = useAppStore((state) => state.selectedRoleMode);
  const setCurrentSessionId = useAppStore((state) => state.setCurrentSessionId);

  const sessionId = useMemo(() => String(params.sessionId ?? ''), [params.sessionId]);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [status, setStatus] = useState<'active' | 'ended'>('active');
  const [sessionRoleMode, setSessionRoleMode] = useState<RoleMode>(selectedRoleMode);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const characterName =
    searchParams.get('characterName')?.trim() ||
    ROLE_NAME_MAP[sessionRoleMode || selectedRoleMode] ||
    '思引';

  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId, setCurrentSessionId]);

  useEffect(() => {
    if (!sessionId || !userId) {
      return;
    }

    fetchJson<SessionMessagesResponse>(
      `/api/sessions/${encodeURIComponent(sessionId)}/messages?userId=${encodeURIComponent(userId)}`,
    )
      .then((data) => {
        setMessages(
          data.items.map((item) => ({
            id: item.id,
            role: item.role,
            content: item.content,
          })),
        );
        setStatus(data.status);
        setSessionRoleMode(data.roleMode);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : '消息加载失败');
      });
  }, [sessionId, userId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();

    if (!userId || !sessionId || status !== 'active' || streaming) {
      return;
    }

    const message = input.trim();
    if (!message) {
      return;
    }

    setError('');
    setInput('');
    setStreaming(true);

    const assistantId = `assistant-temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `user-temp-${Date.now()}`, role: 'user', content: message },
      { id: assistantId, role: 'assistant', content: '', pending: true },
    ]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          roleMode: sessionRoleMode,
          message,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        const messageText =
          (payload as { error?: { message?: string } })?.error?.message ?? '流式请求失败';
        throw new Error(messageText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let splitIndex = buffer.indexOf('\n\n');

        while (splitIndex !== -1) {
          const block = buffer.slice(0, splitIndex);
          buffer = buffer.slice(splitIndex + 2);
          splitIndex = buffer.indexOf('\n\n');

          const payload = parseSseBlock(block);
          if (!payload || typeof payload !== 'object') {
            continue;
          }

          const typed = payload as
            | { type: 'delta'; delta: string }
            | { type: 'complete' }
            | { type: 'follow_up'; items: string[] }
            | { type: 'error'; message: string };

          if (typed.type === 'delta') {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantId
                  ? { ...item, content: item.content + typed.delta }
                  : item,
              ),
            );
          }

          if (typed.type === 'error') {
            setError(typed.message || '流式中断');
          }

          if (typed.type === 'complete') {
            completed = true;
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantId
                  ? { ...item, pending: false }
                  : item,
              ),
            );
          }
        }
      }

      if (!completed) {
        setMessages((prev) => prev.filter((item) => item.id !== assistantId));
        setError('流式未正常完成，已丢弃不完整 assistant。');
      }
    } catch (sendError) {
      setMessages((prev) => prev.filter((item) => item.id !== assistantId));
      setError(sendError instanceof Error ? sendError.message : '发送失败');
    } finally {
      setStreaming(false);
    }
  }

  async function handleEndChat() {
    if (!userId || !sessionId || ending) {
      return;
    }

    setEnding(true);
    setError('');

    try {
      const response = await fetch('/api/chat/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
        }),
      });

      if (response.ok) {
        setStatus('ended');
        router.push(`/end-chat/summary?sessionId=${encodeURIComponent(sessionId)}`);
        return;
      }

      const payload = (await response.json()) as { error?: { code?: string; message?: string } };
      if (payload?.error?.code === 'END_CHAT_IN_PROGRESS') {
        await waitForEndResult(sessionId);
        setStatus('ended');
        router.push(`/end-chat/summary?sessionId=${encodeURIComponent(sessionId)}`);
        return;
      }

      throw new Error(payload?.error?.message ?? '结束对话失败');
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : '结束对话失败');
    } finally {
      setEnding(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col p-4">
      <div className="relative mb-3 flex items-center justify-between">
        <Link href="/character" className="text-sm text-lira-subtext">
          返回角色
        </Link>
        <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-medium text-[#47A389]">
          {characterName}
        </p>
        <button
          type="button"
          onClick={() => {
            handleEndChat().catch(() => undefined);
          }}
          disabled={ending || streaming || status === 'ended'}
          className="rounded-xl bg-[#5b4d43] px-3 py-2 text-sm text-white"
        >
          {ending ? '结束中...' : status === 'ended' ? '已结束' : 'End Chat'}
        </button>
      </div>

      <section className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-[#f8f2ea] p-3">
        {messages.length === 0 ? <p className="text-sm text-lira-subtext">今天感觉怎么样～</p> : null}
        {messages.map((item) => (
          <div
            key={item.id}
            className={`w-fit max-w-[80%] break-words rounded-2xl px-3 py-2 text-sm leading-6 ${
              item.role === 'user'
                ? 'ml-auto bg-lira-accent text-white'
                : 'mr-auto bg-white text-lira-text'
            }`}
          >
            <p className="break-words">{item.content || (item.pending ? '...' : '')}</p>
          </div>
        ))}
      </section>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <form onSubmit={handleSend} className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={status === 'ended' ? '会话已结束，请新开局' : '今天感觉怎么样～'}
          rows={2}
          disabled={streaming || status === 'ended'}
          className="min-h-[74px] flex-1 resize-none rounded-2xl border border-[#d8cbbf] bg-white p-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={streaming || status === 'ended' || !input.trim()}
          className="rounded-2xl bg-lira-accent px-4 py-3 text-sm font-semibold text-white"
        >
          {streaming ? '发送中' : '发送'}
        </button>
      </form>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh flex-col p-4" />}>
      <ChatPageContent />
    </Suspense>
  );
}

