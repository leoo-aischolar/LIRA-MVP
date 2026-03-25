'use client';

import { Inter } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import { useEndResult } from '@/lib/use-end-result';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
});

const bubbleStyles = [
  '-translate-y-4',
  'translate-y-6',
  '-translate-y-8',
  'translate-y-4 ml-4',
  '-translate-y-2',
  'translate-y-8 mr-2',
  'translate-y-2',
];

function StructureResultContent() {
  const router = useRouter();
  const { result, loading, error } = useEndResult();

  const beijingTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const todayWeekday = weekdays[beijingTime.getDay()];

  const structurePoints = useMemo(() => {
    const snakePoints = (result as { structure_points?: Record<string, string | undefined> } | null)?.structure_points;
    if (snakePoints && typeof snakePoints === 'object') {
      return snakePoints;
    }

    return {
      chat_theme: result?.structurePoints?.chatTheme,
      chat_emotions: result?.structurePoints?.chatEmotions,
      core_event: result?.structurePoints?.coreEvent,
      relationship_impact: result?.structurePoints?.relationshipImpact,
      deep_need: result?.structurePoints?.deepNeed,
    };
  }, [result]);

  const rawValues = useMemo(
    () => Object.values(structurePoints || {}).filter(Boolean).map((value) => String(value)),
    [structurePoints],
  );
  const processedPoints = useMemo(
    () =>
      rawValues
        .map((val) => val.replace(/[，,。.\n]/g, ' '))
        .flatMap((val) => val.split(/\s+/))
        .filter(Boolean),
    [rawValues],
  );

  const buttonDelay = `${processedPoints.length * 150 + 300}ms`;

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#F7F3E7] pb-36">
      <p className={`${inter.className} px-6 pt-8 text-xs font-medium tracking-widest text-[#757057]`}>LIRA/STRUCTURE</p>

      <div className="animate-fade-in-up translate-y-6 px-6 opacity-0">
        <section className="mb-8 mt-12 flex flex-col items-center">
          <p className="text-2xl font-normal text-[#C13A35]">{todayWeekday}</p>
          <CheckCircle2 className="mt-3 h-5 w-5 text-[#5E5A48]/80" />
        </section>
      </div>

      <section className="mt-8 mb-24 flex w-full flex-1 flex-wrap items-center justify-center content-center gap-3 px-4">
        {loading ? (
          <p className="animate-fade-in-up translate-y-6 text-center text-base text-black/[0.48] opacity-0">加载中...</p>
        ) : null}
        {error ? (
          <p className="animate-fade-in-up translate-y-6 text-center text-base text-[#A24C47] opacity-0">{error}</p>
        ) : null}
        {!loading && !error && processedPoints.length === 0 ? (
          <p className="animate-fade-in-up translate-y-6 text-center text-base text-black/[0.48] opacity-0">暂无结构要点</p>
        ) : null}
        {!loading && !error
          ? processedPoints.map((point, index) => {
              const staggeredClass = bubbleStyles[index % bubbleStyles.length];
              return (
                <div
                  key={index}
                  className={`bg-[#6DEEC9] rounded-full flex justify-center items-center text-center whitespace-nowrap w-fit aspect-square px-6 text-[#C13A35] text-lg leading-tight animate-fade-in-up shrink-0 shadow-sm ${staggeredClass}`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <p className="font-normal whitespace-nowrap">{point}</p>
                </div>
              );
            })
          : null}
      </section>

      <div
        className="animate-fade-in-up absolute bottom-10 left-0 right-0 w-full translate-y-6 opacity-0"
        style={{ animationDelay: buttonDelay }}
      >
        <div className="flex w-full flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              router.push('/memory');
            }}
            className="mx-auto w-[65%] rounded-full bg-[#F8BD90] py-4 text-center text-xl text-white"
          >
            查看Memory
          </button>
          <button
            type="button"
            onClick={() => {
              router.push('/home');
            }}
            className="mx-auto w-[65%] rounded-full bg-[#F8BD90]/20 py-4 text-center text-xl text-[#F8BD90]"
          >
            返回首页
          </button>
        </div>
      </div>
    </main>
  );
}

export default function StructureResultPage() {
  return (
    <Suspense fallback={<main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-[#F7F3E7] pb-36" />}>
      <StructureResultContent />
    </Suspense>
  );
}
