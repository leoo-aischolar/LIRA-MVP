'use client';

import { Inter, Kameron } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, House, MessageCircle, Plus, SquareLibrary } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
});
const kameron = Kameron({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
});

const BEIJING_TIME_ZONE = 'Asia/Shanghai';
const WEEK_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MOOD_BUBBLES = ['平静', '还不错', '疲惫', '倾诉', '兴奋'];
const CHAT_ROUTE = '/chat-mode';

type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';

const topGreetingMap: Record<TimeSlot, string> = {
  morning: 'Good morning',
  noon: 'Good noon',
  afternoon: 'Good afternoon',
  dusk: 'Good evening',
  night: 'Good evening',
};

const cardCopyMap: Record<TimeSlot, { greeting: string; slogan: string }> = {
  morning: {
    greeting: '早上好～',
    slogan: '新的一天，慢慢开始.',
  },
  noon: {
    greeting: '中午好～',
    slogan: '已经走到这里了，先喘口气吧.',
  },
  afternoon: {
    greeting: '下午',
    slogan: '剩下的时间，过得从容一点.',
  },
  dusk: {
    greeting: '傍晚',
    slogan: '天色慢下来，你也可以慢下来.',
  },
  night: {
    greeting: '晚上好～',
    slogan: '今晚先放松一下，也可以来聊聊.',
  },
};

function getBeijingNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: BEIJING_TIME_ZONE,
    }),
  );
}

function getTimeSlot(date: Date): TimeSlot {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();

  if (totalMinutes >= 6 * 60 && totalMinutes < 11 * 60 + 30) {
    return 'morning';
  }

  if (totalMinutes >= 11 * 60 + 30 && totalMinutes < 14 * 60) {
    return 'noon';
  }

  if (totalMinutes >= 14 * 60 && totalMinutes < 17 * 60) {
    return 'afternoon';
  }

  if (totalMinutes >= 17 * 60 && totalMinutes < 19 * 60 + 30) {
    return 'dusk';
  }

  return 'night';
}

export default function HomePage() {
  const router = useRouter();
  const [beijingNow, setBeijingNow] = useState<Date>(() => getBeijingNow());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const timer = setInterval(() => {
      setBeijingNow(getBeijingNow());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const slot = useMemo(() => getTimeSlot(beijingNow), [beijingNow]);
  const topGreeting = topGreetingMap[slot];
  const cardCopy = cardCopyMap[slot];

  const weekDays = useMemo(() => {
    const today = new Date(beijingNow);
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return WEEK_LABELS.map((label, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();

      return {
        label,
        date: date.getDate(),
        isToday,
      };
    });
  }, [beijingNow]);

  const cardAnimationClass = `${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} transition-all duration-700 ease-out`;

  return (
    <main className="relative min-h-dvh bg-[#D5F5E3]">
      <header className="fixed left-1/2 top-0 z-30 w-full max-w-[480px] -translate-x-1/2 bg-[#D5F5E3]/95 px-6 pb-4 pt-6 backdrop-blur-sm">
        <p className={`${kameron.className} text-center text-[1.6rem] font-bold leading-none text-[#5E5A48]`}>
          {topGreeting}
        </p>

        <div className="mt-5 flex items-center justify-between">
          {weekDays.map((item) => (
            <div
              key={`${item.label}-${item.date}`}
              className={`${inter.className} flex min-w-[42px] flex-col items-center justify-center text-[#666350] ${
                item.isToday ? 'rounded-md border border-[#5E5A48] px-1 py-1 opacity-100' : 'opacity-50'
              }`}
            >
              <span className="text-xs font-semibold">{item.label}</span>
              <span className="mt-0.5 text-sm font-medium">{item.date}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="px-6 pb-36 pt-[154px]">
        <div className="grid grid-cols-2 gap-4">
          <article
            style={{ transitionDelay: '80ms' }}
            className={`${cardAnimationClass} col-span-2 flex min-h-[250px] flex-col rounded-2xl bg-[#F2ECCF] px-5 py-8 shadow-[0_8px_24px_rgba(132,122,95,0.14)]`}
          >
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-lg font-medium text-[#A59A88]">{cardCopy.greeting}</p>
              <h2 className="mt-2 whitespace-nowrap text-[26px] font-semibold leading-tight tracking-tight text-[#D85651]">
                {cardCopy.slogan}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => router.push(CHAT_ROUTE)}
              className="mx-auto mt-6 inline-flex rounded-full bg-[#E5EFD6] px-8 py-2 text-base font-semibold text-black/70"
            >
              开始
            </button>
          </article>

          <article
            style={{ transitionDelay: '180ms' }}
            className={`${cardAnimationClass} col-span-1 flex min-h-[206px] flex-col rounded-2xl bg-[#F2ECCF] p-4 shadow-[0_8px_24px_rgba(132,122,95,0.14)]`}
          >
            <p className="text-sm text-[#A59A88]">感受此刻～</p>
            <h3 className="mt-1 text-xl font-semibold leading-snug text-[#D85651]">此刻的心情，更像哪一种?</h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {MOOD_BUBBLES.map((mood, index) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => router.push(CHAT_ROUTE)}
                  className={`rounded-full bg-[#E5EFD6] px-3 py-1 text-xs text-black/45 ${
                    index === 1 || index === 4 ? 'ml-3' : ''
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </article>

          <article
            style={{ transitionDelay: '280ms' }}
            className={`${cardAnimationClass} col-span-1 flex min-h-[206px] flex-col rounded-2xl bg-[#F2ECCF] p-4 shadow-[0_8px_24px_rgba(132,122,95,0.14)]`}
          >
            <p className="text-sm text-[#A59A88]">留点空间～</p>
            <h3 className="mt-1 text-xl font-bold leading-snug text-[#D85651]">有没有一种情绪，今天陪了你很久?</h3>

            <button
              type="button"
              onClick={() => router.push(CHAT_ROUTE)}
              className="mt-auto self-end rounded-full bg-[#E5EFD6] px-5 py-1.5 text-sm font-semibold text-black/70"
            >
              开始
            </button>
          </article>

          <article
            style={{ transitionDelay: '380ms' }}
            className={`${cardAnimationClass} col-span-2 flex min-h-[178px] flex-col rounded-2xl bg-[#F2ECCF] p-5 shadow-[0_8px_24px_rgba(132,122,95,0.14)]`}
          >
            <p className="text-sm text-[#A59A88]">写下此刻～</p>
            <h3 className="mt-1 text-2xl font-bold leading-snug text-[#D85651]">留住今天的心情和片段</h3>

            <button
              type="button"
              onClick={() => router.push(CHAT_ROUTE)}
              className="mt-auto self-end rounded-full bg-[#E5EFD6] px-5 py-1.5 text-sm font-semibold text-black/70"
            >
              开始
            </button>
          </article>
        </div>
      </section>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-[#b7d9cc] bg-[#D5F5E3]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-10px_20px_rgba(85,126,112,0.14)] backdrop-blur-sm">
        <div className="grid grid-cols-5 items-end text-center">
          <button type="button" onClick={() => router.push('/home')} className="flex flex-col items-center justify-end text-[#C13A35]">
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
