'use client';

import { Inter, Noto_Serif_SC } from 'next/font/google';
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

const notoSerifSc = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const CHAT_ROUTE = '/chat-mode';

type MemoryApiItem = {
  sessionId: string;
  endedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reflectionCard?: string | null;
  reflection_card?: string | null;
  summary?: string | null;
  chat_summary?: string | null;
  structurePoints?: {
    coreEvent?: string | null;
    chatEmotions?: string | null;
    deepNeed?: string | null;
  };
  core_event?: string | null;
  chat_emotions?: string | null;
  deep_need?: string | null;
  chatHistory?: Array<{ createdAt?: string | null }>;
};

type MemoryResponse = {
  items: MemoryApiItem[];
};

type ReflectionCard = {
  id: string;
  timestamp: string;
  quote: string;
  points: string[];
  summary: string;
};

function formatTimestamp(dateText?: string | null) {
  if (!dateText) {
    return '--/--/-- --:--:--';
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return '--/--/-- --:--:--';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}

function toReflectionCard(item: MemoryApiItem): ReflectionCard {
  const quote = (item.reflectionCard ?? item.reflection_card ?? '').trim() || '今天值得被你认真记录。';
  const coreEvent = (item.structurePoints?.coreEvent ?? item.core_event ?? '').trim() || '未记录';
  const chatEmotions = (item.structurePoints?.chatEmotions ?? item.chat_emotions ?? '').trim() || '未记录';
  const deepNeed = (item.structurePoints?.deepNeed ?? item.deep_need ?? '').trim() || '未记录';
  const summary = (item.summary ?? item.chat_summary ?? '').trim() || '这次对话还没有生成总结。';

  const timeSource = item.createdAt ?? item.updatedAt ?? item.endedAt ?? item.chatHistory?.at(-1)?.createdAt;

  return {
    id: item.sessionId,
    timestamp: formatTimestamp(timeSource),
    quote,
    points: [`事件：${coreEvent}`, `情绪：${chatEmotions}`, `深层洞察：${deepNeed}`],
    summary,
  };
}

export default function ReflectionPage() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);

  const [cards, setCards] = useState<ReflectionCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardsVisible, setCardsVisible] = useState(false);
  const requestLockRef = useRef<string | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setCards([]);
      setLoading(false);
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

    setLoading(true);
    setError('');

    fetchMemoryFeed<MemoryResponse>(userId)
      .then((data) => {
        if (cancelled || controller.signal.aborted || requestSeqRef.current !== requestSeq) {
          return;
        }

        setCards((data.items ?? []).map(toReflectionCard));
      })
      .catch((loadError) => {
        if (cancelled || controller.signal.aborted || requestSeqRef.current !== requestSeq) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Reflection 加载失败，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled && !controller.signal.aborted && requestSeqRef.current === requestSeq) {
          setLoading(false);
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

  useEffect(() => {
    setCardsVisible(false);

    if (!cards.length) {
      return;
    }

    const timer = setTimeout(() => {
      setCardsVisible(true);
    }, 40);

    return () => clearTimeout(timer);
  }, [cards]);

  const skeletonRows = useMemo(() => Array.from({ length: 3 }), []);

  return (
    <main className="relative min-h-dvh bg-[#D5F5E3] px-6 pb-24 pt-7">
      <header>
        <h1 className={`${inter.className} text-3xl font-bold text-[#C13A35]`}>Reflection</h1>
      </header>

      <section className="mt-6 flex flex-col gap-6">
        {loading
          ? skeletonRows.map((_, index) => (
              <article
                key={`skeleton-${index}`}
                className="animate-pulse rounded-2xl bg-[#AEE6CA] p-6 shadow-[0_10px_28px_rgba(88,145,123,0.15)]"
              >
                <div className="h-3 w-40 rounded-full bg-black/10" />
                <div className="ml-auto mt-5 h-6 w-4/5 rounded-md bg-black/15" />
                <div className="mt-2 ml-auto h-6 w-3/5 rounded-md bg-black/15" />
                <div className="mt-7 space-y-3">
                  <div className="h-4 w-full rounded-md bg-black/10" />
                  <div className="h-4 w-11/12 rounded-md bg-black/10" />
                  <div className="h-4 w-4/5 rounded-md bg-black/10" />
                </div>
                <div className="mt-7 space-y-2">
                  <div className="h-3 w-full rounded-md bg-black/10" />
                  <div className="h-3 w-10/12 rounded-md bg-black/10" />
                </div>
              </article>
            ))
          : null}

        {!loading && !error && cards.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center text-center">
            <p className="text-base text-[#A59A88]">还没有留下记忆，去开启一次对话吧</p>
          </div>
        ) : null}

        {!loading && error ? <p className="text-sm text-[#A24C47]">{error}</p> : null}

        {!loading && !error
          ? cards.map((card, index) => (
              <article
                key={card.id}
                style={{ transitionDelay: `${index * 150}ms` }}
                className={`rounded-2xl bg-[#AEE6CA] p-6 shadow-[0_10px_28px_rgba(88,145,123,0.15)] transition-all duration-700 ease-out ${
                  cardsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
              >
                <p className={`${inter.className} mb-4 text-left text-xs text-black/50`}>{card.timestamp}</p>

                <p className={`${notoSerifSc.className} mb-6 text-right text-lg text-black/80 whitespace-pre-line`}>{card.quote}</p>

                <div className="mb-6 space-y-2">
                  {card.points.map((point) => (
                    <p key={`${card.id}-${point}`} className="text-base text-black/75">
                      {point}
                    </p>
                  ))}
                </div>

                <p className="text-sm leading-relaxed text-black/50">{card.summary}</p>
              </article>
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

          <button type="button" className="flex flex-col items-center justify-end text-[#C13A35]" aria-current="page">
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

          <button
            type="button"
            onClick={() => router.push('/memory')}
            className="flex flex-col items-center justify-end text-[#C13A35]/50"
          >
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
