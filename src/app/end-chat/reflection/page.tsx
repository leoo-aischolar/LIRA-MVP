'use client';

import { Inter, Noto_Serif_SC } from 'next/font/google';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import { useEndResult } from '@/lib/use-end-result';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
});

const notoSerifSc = Noto_Serif_SC({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

function ReflectionResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = useMemo(() => searchParams.get('sessionId') ?? '', [searchParams]);
  const { sessionId: hookSessionId, result, loading, error } = useEndResult();
  const sessionId = sessionIdFromUrl || hookSessionId;

  const beijingTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const todayWeekday = weekdays[beijingTime.getDay()];

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#F7F3E7]">
      <p className={`${inter.className} px-6 pt-8 text-xs font-medium tracking-widest text-[#757057]`}>
        LIRA/REFLECTION
      </p>

      <div className="animate-fade-in-up translate-y-6 px-6 opacity-0">
        <section className="mb-6 mt-12 flex flex-col items-center">
          <p className="text-2xl font-normal text-[#C13A35]">{todayWeekday}</p>
          <CheckCircle2 className="mt-3 h-5 w-5 text-[#5E5A48]/80" />
        </section>

        <section className="mx-auto flex aspect-[3/4] w-[76%] flex-col items-center justify-center rounded-[1.5rem] bg-[#8EF7D9] p-6 text-center">
          {loading ? <p className="text-center text-base text-black/[0.48]">加载中...</p> : null}
          {error ? <p className="text-center text-base text-[#A24C47]">{error}</p> : null}
          {!loading && !error ? (
            <p className={`${notoSerifSc.className} text-center text-xl font-normal leading-relaxed text-black/[0.48]`}>
              {result?.reflectionCard || '暂无反思卡片'}
            </p>
          ) : null}
        </section>
      </div>

      <div className="absolute bottom-12 left-0 right-0 w-full flex justify-center">
        <button
          type="button"
          onClick={() => {
            router.push(`/end-chat/structure?sessionId=${encodeURIComponent(sessionId)}`);
          }}
          className="animate-fade-in-up mx-auto w-[65%] translate-y-6 rounded-full bg-[#F8BD90] py-4 text-center text-xl text-white opacity-0"
          style={{ animationDelay: '200ms' }}
        >
          下一页
        </button>
      </div>
    </main>
  );
}

export default function ReflectionResultPage() {
  return (
    <Suspense fallback={<main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#F7F3E7]" />}>
      <ReflectionResultContent />
    </Suspense>
  );
}
