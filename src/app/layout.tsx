import type { Metadata } from 'next';
import './globals.css';
import { AppBootstrap } from '@/components/AppBootstrap';

export const metadata: Metadata = {
  title: 'LIRA MVP',
  description: 'LIRA mobile-first MVP demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-dvh max-w-[480px] bg-lira-bg shadow-[0_8px_30px_rgba(67,44,24,0.18)]">
          <AppBootstrap />
          {children}
        </div>
      </body>
    </html>
  );
}
