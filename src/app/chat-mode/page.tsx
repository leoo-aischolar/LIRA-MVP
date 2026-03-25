'use client';

import { Inter } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';
import { RoleMode } from '@/types/role-mode';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const chatModes: Array<{ id: RoleMode; title: string; desc: string }> = [
  { id: 'Reflective_Guide', title: '照见', desc: '陪你梳理情绪，也陪你看清自己' },
  { id: 'Gentle_Companion', title: '相伴', desc: '给你不打扰的陪伴，与日常里的轻轻连接' },
  { id: 'Custom_Character', title: '心选', desc: '创造一个更贴近你心意的专属角色' },
];

export default function ChatModePage() {
  const router = useRouter();
  const setSelectedRoleMode = useAppStore((state) => state.setSelectedRoleMode);

  function handleSelectMode(modeId: RoleMode) {
    setSelectedRoleMode(modeId);
    router.push(`/characters?roleMode=${modeId}`);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3]">
      <header className="relative flex items-center justify-center px-6 pb-6 pt-8">
        <button
          type="button"
          onClick={() => router.push('/home')}
          className={`${inter.className} absolute left-6 text-sm text-black/50`}
        >
          返回主页
        </button>
        <h1 className="text-2xl font-medium text-[#5E5A48]">选择模式</h1>
      </header>

      <section className="px-6">
        {chatModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleSelectMode(mode.id)}
            className="animate-fade-in-up mb-5 w-full translate-y-6 rounded-2xl bg-[#C9FFEF] p-6 text-left opacity-0"
          >
            <p className="mb-2 text-2xl font-medium text-[#5E5A48]">{mode.title}</p>
            <p className="text-base text-black/30">{mode.desc}</p>
          </button>
        ))}
      </section>
    </main>
  );
}
