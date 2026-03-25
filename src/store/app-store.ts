'use client';

import { create } from 'zustand';
import { RoleMode } from '@/types/role-mode';

const STORAGE_KEY = 'lira_user_id';

type AppState = {
  userId: string;
  currentSessionId: string | null;
  selectedRoleMode: RoleMode;
  initUser: () => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setSelectedRoleMode: (roleMode: RoleMode) => void;
};

function createAnonymousId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useAppStore = create<AppState>((set) => ({
  userId: '',
  currentSessionId: null,
  selectedRoleMode: 'Reflective_Guide',
  initUser: () => {
    if (typeof window === 'undefined') {
      return;
    }

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      set({ userId: existing });
      return;
    }

    const nextId = createAnonymousId();
    window.localStorage.setItem(STORAGE_KEY, nextId);
    set({ userId: nextId });
  },
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setSelectedRoleMode: (roleMode) => set({ selectedRoleMode: roleMode }),
}));
