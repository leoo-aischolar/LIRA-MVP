'use client';

import { Inter } from 'next/font/google';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

function CreateCharacterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRoleMode = searchParams.get('roleMode') ?? 'Reflective_Guide';
  const [characterName, setCharacterName] = useState('');

  const canSubmit = useMemo(() => characterName.trim().length > 0, [characterName]);

  function handleCreate() {
    if (!canSubmit) {
      return;
    }

    const trimmedName = characterName.trim();
    if (!trimmedName) {
      return;
    }

    const storageKey = 'lira_custom_chars';
    let existingCharacters: Array<{ id: string; name: string; desc: string; roleMode: string }> = [];

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      existingCharacters = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is { id: string; name: string; desc: string; roleMode: string } =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as { id?: unknown }).id === 'string' &&
              typeof (item as { name?: unknown }).name === 'string' &&
              typeof (item as { desc?: unknown }).desc === 'string' &&
              typeof (item as { roleMode?: unknown }).roleMode === 'string',
          )
        : [];
    } catch {
      existingCharacters = [];
    }

    const nextCharacter = {
      id: `custom_${Date.now()}`,
      name: trimmedName,
      desc: '自定义角色',
      roleMode: currentRoleMode,
    };

    existingCharacters.push(nextCharacter);

    window.localStorage.setItem(storageKey, JSON.stringify(existingCharacters));
    router.back();
  }

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3]">
      <header className="relative flex items-center justify-center px-6 pb-6 pt-10">
        <button
          type="button"
          onClick={() => router.back()}
          className={`${inter.className} absolute left-6 text-base text-black/50`}
        >
          返回
        </button>

        <h1 className="text-2xl font-medium text-[#5E5A48]">创建角色</h1>
      </header>

      <section className="mt-8 px-6">
        <article className="animate-fade-in-up translate-y-6 rounded-3xl bg-[#EDE6D1] p-8 opacity-0">
          <h2 className="mb-6 text-3xl font-normal text-[#6D8D3A]">角色名称*</h2>

          <input
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
            placeholder="输入角色名称"
            className="w-full rounded-xl bg-[#FAF5EB] px-5 py-4 text-lg text-[#5E5A48] outline-none placeholder:text-lg placeholder:text-[#79C8AE]"
          />
        </article>
      </section>

      <div className="absolute bottom-12 left-6 right-6">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className={`w-full rounded-full py-4 text-2xl text-white transition-opacity ${
            canSubmit ? 'bg-[#F8BD90] opacity-100' : 'bg-[#F8BD90] opacity-50'
          }`}
        >
          创建
        </button>
      </div>
    </main>
  );
}

export default function CreateCharacterPage() {
  return (
    <Suspense fallback={<main className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-[#D5F5E3]" />}>
      <CreateCharacterPageContent />
    </Suspense>
  );
}
