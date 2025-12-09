'use client';

import { Home, LayoutGrid, Zap, Clipboard, Menu } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-20 bg-[#d8d9e8] flex flex-col items-center py-6 gap-4">
      <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      <button className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
        <Home className="w-6 h-6 text-white" />
      </button>

      <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
        <LayoutGrid className="w-6 h-6 text-gray-600" />
      </button>

      <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
        <Zap className="w-6 h-6 text-gray-600" />
      </button>

      <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
        <Clipboard className="w-6 h-6 text-gray-600" />
      </button>
    </aside>
  );
}
