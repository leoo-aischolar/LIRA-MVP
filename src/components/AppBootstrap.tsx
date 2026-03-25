'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function AppBootstrap() {
  const initUser = useAppStore((state) => state.initUser);

  useEffect(() => {
    initUser();
  }, [initUser]);

  return null;
}
