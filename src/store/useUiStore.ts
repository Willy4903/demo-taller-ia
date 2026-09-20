import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface UiStoreState {
  theme: Theme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem('dashboard-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    /* ignore storage errors */
  }
  return 'light';
}

function applyThemeClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem('dashboard-theme', theme);
  } catch {
    /* ignore storage errors */
  }
}

export const useUiStore = create<UiStoreState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    applyThemeClass(next);
    set({ theme: next });
  },
  setTheme: (theme) => {
    applyThemeClass(theme);
    set({ theme });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
