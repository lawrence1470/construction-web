'use client';

import { Search, Moon, Plus } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

export default function Header() {
  return (
    <header className="bg-[#e8e9f3] px-6 py-4 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white rounded-full"></div>
        </div>
        <span className="text-gray-800 font-medium">BuildTrack Pro</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
          <Moon className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <button className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden cursor-pointer">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
        <button className="bg-gray-800 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-gray-700 transition-colors cursor-pointer">
          <Plus className="w-5 h-5" />
          Add task
        </button>
      </div>
    </header>
  );
}
