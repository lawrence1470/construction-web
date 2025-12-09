'use client';

import { Search, Moon, Sun, Plus } from 'lucide-react';
import UserMenu from './UserMenu';
import { useThemeStore } from '@/store/useThemeStore';

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="bg-[var(--bg-primary)] dark:bg-[var(--bg-primary)] px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)] transition-colors duration-300">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white rounded-full"></div>
        </div>
        <span className="text-[var(--text-primary)] font-medium">BuildTrack Pro</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 bg-[var(--bg-secondary)] dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>
        <button className="w-10 h-10 bg-[var(--bg-secondary)] dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
          <Search className="w-5 h-5 text-[var(--text-secondary)]" />
        </button>
        <UserMenu />
        <button className="bg-gray-800 dark:bg-purple-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-gray-700 dark:hover:bg-purple-500 transition-colors cursor-pointer">
          <Plus className="w-5 h-5" />
          Add task
        </button>
      </div>
    </header>
  );
}
