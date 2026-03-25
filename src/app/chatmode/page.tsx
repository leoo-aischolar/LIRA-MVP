'use client';

import { Inter } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpenText, House, MessageCircle, Plus, SquareLibrary } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const CHAT_ROUTE = '/chat-mode';

const chatModes = [
  { title: '照见', desc: '陪你梳理情绪，也陪你看清自己' },
  { title: '相伴', desc: '给你不打扰的陪伴，与日常里的轻轻连接' },
  { title: '心选', desc: '创造一个更贴近你心意的专属角色' },
];

export default function ChatmodePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3] pb-24">
      <header className="px-6 pb-6 pt-8">
        <h1 className={`${inter.className} text-3xl font-bold text-[#C13A35]`}>Chatmode</h1>
      </header>

      <section className="px-6">
        {chatModes.map((mode, index) => (
          <article
            key={mode.title}
            style={{ animationDelay: `${index * 150}ms` }}
            className={`animate-fade-in-up mb-5 min-h-[160px] rounded-2xl bg-[#C9FFEF] px-6 py-10 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="mb-2 text-2xl font-medium text-[#5E5A48]">{mode.title}</p>
            <p className="text-base text-black/30">{mode.desc}</p>
          </article>
        ))}
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

          <button
            type="button"
            onClick={() => router.push('/memory')}
            className="flex flex-col items-center justify-end text-[#C13A35]/50"
          >
            <SquareLibrary size={20} strokeWidth={2.1} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Memory</span>
          </button>

          <button type="button" className="flex flex-col items-center justify-end text-[#C13A35]" aria-current="page">
            <MessageCircle size={20} strokeWidth={2.1} />
            <span className={`${inter.className} mt-1 text-xs font-semibold`}>Chatmode</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
