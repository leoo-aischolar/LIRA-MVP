'use client';

import { useEffect } from 'react';
import { Instrument_Serif, Kadwa } from 'next/font/google';
import { useRouter } from 'next/navigation';

const kadwa = Kadwa({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/oobe');
  }, [router]);

  const enterOobe = () => {
    router.push('/oobe');
  };

  return (
    <main
      className="relative min-h-dvh w-full cursor-pointer overflow-hidden"
      onClick={enterOobe}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          enterOobe();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Enter LIRA onboarding flow"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/start_bg.png')" }}
        aria-hidden="true"
      />

      <section className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
        <h1
          className={`${kadwa.className} animate-start-title text-7xl font-bold tracking-[0.08em] text-[#7D9D47] opacity-0 sm:text-[5.5rem]`}
        >
          LIRA
        </h1>

        <p
          className={`${kadwa.className} animate-start-secondary mt-6 whitespace-pre-line text-xl leading-relaxed text-[#943939] opacity-0 sm:text-2xl`}
        >
          {'\u8BA9\u966A\u4F34 \u6709\u89D2\u8272 \u4E5F\u6709\u8BB0\u5FC6\nCompanionship, shaped by role\nand memory'}
        </p>
      </section>

      <p
        className={`${instrumentSerif.className} animate-start-secondary absolute bottom-8 left-6 text-base text-[#465133] opacity-0`}
      >
        Designed by leo
      </p>
    </main>
  );
}
