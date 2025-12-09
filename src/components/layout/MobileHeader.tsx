'use client';

import { Search, Moon, Plus, Menu } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="bg-[#e8e9f3] px-4 py-3 flex items-center justify-between border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          aria-label="Open menu"
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <span className="text-gray-800 font-medium text-sm">BuildTrack</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
          <Moon className="w-4 h-4 text-gray-600" />
        </button>
        <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
          <Search className="w-4 h-4 text-gray-600" />
        </button>
        <button className="w-9 h-9 bg-gray-300 rounded-full overflow-hidden cursor-pointer">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
        <button className="bg-gray-800 text-white p-2 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
