'use client';

import { Search, Moon, Sun, Plus, Menu } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';
import { useThemeStore } from '@/store/useThemeStore';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="bg-[var(--bg-primary)] dark:bg-[var(--bg-primary)] px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-[var(--border-color)] sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          aria-label="Open menu"
          className="w-10 h-10 bg-white dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <span className="text-gray-800 dark:text-[var(--text-primary)] font-medium text-sm">BuildTrack</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 bg-white dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>
        <button className="w-9 h-9 bg-white dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
          <Search className="w-4 h-4 text-gray-600 dark:text-[var(--text-secondary)]" />
        </button>
        <button className="w-9 h-9 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden cursor-pointer">
          <ImageWithFallback
            src="/images/avatar-1.jpg"
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
        <button className="bg-gray-800 dark:bg-purple-600 text-white p-2 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-purple-500 transition-colors cursor-pointer">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
