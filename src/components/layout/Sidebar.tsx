'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Zap, Clipboard } from 'lucide-react';
import { navItems } from './navItems';

export default function Sidebar() {
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

  return (
    <aside className="h-screen w-20 bg-[#d8d9e8] dark:bg-[var(--bg-primary)] flex flex-col items-center py-6 gap-4 sticky top-0 transition-colors duration-300">
      {navItems.map((item) => {
        const Icon = getIcon(item.icon);
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
              isActive
                ? 'bg-gray-800 dark:bg-purple-600 hover:bg-gray-700 dark:hover:bg-purple-500'
                : 'bg-white dark:bg-[var(--bg-input)] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-600 dark:text-[var(--text-secondary)]'}`} />
          </Link>
        );
      })}
    </aside>
  );
}
