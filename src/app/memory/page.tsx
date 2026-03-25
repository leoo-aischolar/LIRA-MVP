'use client';

import { Inter } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, House, MessageCircle, Plus, SquareLibrary } from 'lucide-react';
import { fetchMemoryFeed } from '@/lib/memory-feed';
import { useAppStore } from '@/store/app-store';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const CHAT_ROUTE = '/chat-mode';

type MemoryApiItem = {
  sessionId: string;
  characterName?: string | null;
  roleMode?: string | null;
  character?: {
    roleMode?: string | null;
    name?: string | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  endedAt?: string | null;
  summary?: string | null;
  chat_summary?: string | null;
  endChatResult?: {
    chatSummary?: string | null;
    createdAt?: string | null;
  } | null;
  chatHistory?: Array<{ createdAt?: string | null }> | null;
};

type MemoryResponse = {
  items: MemoryApiItem[];
};

type MemoryRecord = {
  id: string;
  role: string;
  summary: string;
  createdAt: string;
};

type MemoryGroup = {
  date: string;
  records: MemoryRecord[];
};

function normalizeDateValue(dateText?: string | null): Date | null {
  if (!dateText) {
    return null;
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatDateKey(dateText?: string | null): string {
  const parsed = normalizeDateValue(dateText);
  if (!parsed) {
    return '1970-01-01';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapRoleName(roleMode?: string | null): string {
  const normalized = (roleMode ?? '').trim();

  if (normalized === 'Reflective_Guide' || normalized === '冷静的反思镜子') {
    return '思引';
  }

  if (normalized === 'Warm_Listener' || normalized === 'Gentle_Companion' || normalized === '温暖的树洞') {
    return '心伴';
  }

  if (normalized === 'Custom' || normalized === 'Custom_Character' || normalized === '你的专属伙伴') {
    return '万相';
  }

  return '';
}

function pickCreatedAt(item: MemoryApiItem): string {
  return (
    item.createdAt ??
    item.endChatResult?.createdAt ??
    item.updatedAt ??
    item.endedAt ??
    item.chatHistory?.at(-1)?.createdAt ??
    new Date(0).toISOString()
  );
}

function toMemoryRecord(item: MemoryApiItem): MemoryRecord {
  const summary =
    (item.chat_summary ?? item.summary ?? item.endChatResult?.chatSummary ?? '').trim() || '今天的记忆正在酝酿。';

  const createdAt = pickCreatedAt(item);
  const roleMode = item.roleMode ?? item.character?.roleMode ?? null;
  const characterName = (item.characterName ?? item.character?.name ?? '').trim();
  const displayName = characterName || mapRoleName(roleMode) || '未知角色';

  return {
    id: item.sessionId,
    role: displayName,
    summary,
    createdAt,
  };
}

function groupByDate(records: MemoryRecord[]): MemoryGroup[] {
  const groupedMap = new Map<string, MemoryRecord[]>();

  for (const record of records) {
    const key = formatDateKey(record.createdAt);
    const list = groupedMap.get(key) ?? [];
    list.push(record);
    groupedMap.set(key, list);
  }

  return Array.from(groupedMap.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, groupedRecords]) => ({
      date,
      records: groupedRecords.sort((left, right) => {
        const rightTime = normalizeDateValue(right.createdAt)?.getTime() ?? 0;
        const leftTime = normalizeDateValue(left.createdAt)?.getTime() ?? 0;
        return rightTime - leftTime;
      }),
    }));
}

export default function MemoryPage() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);

  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const requestLockRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setRecords([]);
      setIsLoading(false);
      setError('');
      requestLockRef.current = null;
      return;
    }

    if (requestLockRef.current === userId) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const requestSeq = ++requestSeqRef.current;
    requestLockRef.current = userId;
    setIsLoading(true);
    setError('');

    fetchMemoryFeed<MemoryResponse>(userId)
      .then((data) => {
        if (cancelled || controller.signal.aborted || requestSeqRef.current !== requestSeq) {
          return;
        }
        setRecords((data.items ?? []).map(toMemoryRecord));
      })
      .catch((loadError) => {
        if (cancelled || controller.signal.aborted || requestSeqRef.current !== requestSeq) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Memory 加载失败');
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted && requestSeqRef.current === requestSeq) {
          setIsLoading(false);
          requestLockRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (requestLockRef.current === userId) {
        requestLockRef.current = null;
      }
    };
  }, [userId]);

  const groupedMemories = useMemo(() => groupByDate(records), [records]);

  useEffect(() => {
    setVisible(false);
    if (!groupedMemories.length) {
      return;
    }

    const timer = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(timer);
  }, [groupedMemories]);

  let cascadeIndex = 0;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3] pb-24">
      <header className="px-6 pb-4 pt-8">
        <h1 className={`${inter.className} text-3xl font-bold text-[#C13A35]`}>Memory</h1>
      </header>

      <section className="px-6">
        {isLoading ? (
          <div className="py-14 text-center">
            <p className={`${inter.className} text-sm text-black/50`}>Loading memory...</p>
          </div>
        ) : null}

        {!isLoading && error ? <p className="py-10 text-sm text-[#A24C47]">{error}</p> : null}

        {!isLoading && !error && groupedMemories.length === 0 ? (
          <p className="py-16 text-center text-base text-black/50">还没有留下记忆，去开启一次对话吧</p>
        ) : null}

        {!isLoading && !error
          ? groupedMemories.map((group) => (
              <section key={group.date} className="mb-6">
                <h2 className={`${inter.className} mb-3 text-sm text-black/50`}>{group.date}</h2>
                <div className="flex flex-col gap-4">
                  {group.records.map((record) => {
                    const delayIndex = cascadeIndex;
                    cascadeIndex += 1;

                    return (
                      <article
                        key={record.id}
                        className={`animate-fade-in-up rounded-2xl bg-[#C9FFEF] p-5 ${
                          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                        }`}
                        style={{ animationDelay: `${delayIndex * 150}ms` }}
                      >
                        <p className="mb-3 text-xl font-normal text-black/80">{record.role}</p>
                        <p className="text-base leading-relaxed text-black/[0.48]">{record.summary}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </section>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-[#b7d9cc] bg-[#D5F5E3]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-10px_20px_rgba(85,126,112,0.14)] backdrop-blur-sm">
        <div className="grid grid-cols-5 items-end text-center">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="flex flex-col items-center justify-end text-[#C13A35]/50"
          >
            <House size={20} strokeWidth={2.2} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Today</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/reflection')}
            className="flex flex-col items-center justify-end text-[#C13A35]/50"
          >
            <BookOpenText size={20} strokeWidth={2.1} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Reflection</span>
          </button>

          <button
            type="button"
            onClick={() => router.push(CHAT_ROUTE)}
            className="mx-auto flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-[#86D2BA] text-white shadow-[0_10px_18px_rgba(64,151,125,0.35)]"
            aria-label="Create"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <button type="button" className="flex flex-col items-center justify-end text-[#C13A35]" aria-current="page">
            <SquareLibrary size={20} strokeWidth={2.1} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Memory</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/chatmode')}
            className="flex flex-col items-center justify-end text-[#C13A35]/50"
          >
            <MessageCircle size={20} strokeWidth={2.1} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Chatmode</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
