'use client';

import { Kadwa, Noto_Sans_SC } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const oobeData = [
  {
    bg: '/picture_draft/oobe_1bg.png',
    title: '可选择的关系陪伴',
    desc: '在 LIRA, 你不是和一个AI 对话\n而是在不同关系角色中获得陪伴',
    btn: 'NEXT',
  },
  {
    bg: '/picture_draft/oobe_2bg.png',
    title: '被理解\n也被记住',
    desc: '你的情绪、偏好和未说完的话\n会在一次次对话中被温柔延续',
    btn: 'NEXT',
  },
  {
    bg: '/picture_draft/oobe_3bg.png',
    title: '在陪伴里\n慢慢靠近自己',
    desc: '选择不同角色陪你走一段\n被安抚，也被照见的旅程',
    btn: '进入 LIRA',
  },
] as const;

const kadwa = Kadwa({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const notoSansSc = Noto_Sans_SC({
  preload: false,
  weight: ['300', '400'],
  display: 'swap',
});

export default function OobePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const currentStep = oobeData[step];

  useEffect(() => {
    router.prefetch('/home');
  }, [router]);

  const onNext = () => {
    if (step < oobeData.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    router.push('/home');
  };

  return (
    <main className="relative mx-auto h-dvh w-full max-w-[480px] overflow-hidden bg-[#dbe5cd]">
      <div className="absolute inset-0" aria-hidden="true">
        {oobeData.map((item, index) => (
          <div
            key={`${item.bg}-${index}`}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-out ${
              step === index ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url('${item.bg}')` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/5" />
      </div>

      <div key={step} className="absolute inset-0">
        <p
          className={`${kadwa.className} oobe-fade oobe-delay-secondary absolute left-6 top-6 text-3xl tracking-[0.08em] text-[#7D9D47]/75`}
        >
          LIRA
        </p>

        <section className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
          <h1
            className={`${notoSansSc.className} oobe-fade oobe-delay-primary whitespace-pre-line text-4xl font-light leading-snug text-[#6E8E39]`}
          >
            {currentStep.title}
          </h1>

          <p
            className={`${notoSansSc.className} oobe-fade oobe-delay-secondary mt-6 whitespace-pre-line text-lg font-light leading-relaxed text-[#943939]/78`}
          >
            {currentStep.desc}
          </p>
        </section>

        <div className="absolute bottom-12 left-0 w-full flex justify-center">
          <button
            type="button"
            className={`${kadwa.className} oobe-fade oobe-delay-button rounded-full bg-[#3EA588] px-10 py-3 text-xl tracking-[0.05em] text-[#6AE4D2]`}
            onClick={onNext}
          >
            {currentStep.btn}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes oobeFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .oobe-fade {
          opacity: 0;
          animation-name: oobeFadeInUp;
          animation-duration: 1500ms;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }

        .oobe-delay-primary {
          animation-delay: 0ms;
        }

        .oobe-delay-secondary {
          animation-delay: 1200ms;
        }

        .oobe-delay-button {
          animation-delay: 2400ms;
        }
      `}</style>
    </main>
  );
}
