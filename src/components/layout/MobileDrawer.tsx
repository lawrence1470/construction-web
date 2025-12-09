'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Home, LayoutGrid, Zap, Clipboard } from 'lucide-react';
import { navItems } from './navItems';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home': return Home;
      case 'LayoutGrid': return LayoutGrid;
      case 'Zap': return Zap;
      case 'Clipboard': return Clipboard;
      default: return Home;
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#d8d9e8] dark:bg-[var(--bg-primary)] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300/50 dark:border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded-full"></div>
            </div>
            <span className="text-gray-800 dark:text-[var(--text-primary)] font-medium">BuildTrack Pro</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-10 h-10 bg-white dark:bg-[var(--bg-input)] rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-gray-800 dark:bg-purple-600 text-white'
                    : 'bg-white/50 dark:bg-[var(--bg-input)]/50 text-gray-700 dark:text-[var(--text-primary)] hover:bg-white dark:hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
