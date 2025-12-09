'use client';

import { TrendingUp } from 'lucide-react';

export default function StatsCards() {
  return (
    <div className="flex gap-6">
      <div className="bg-white rounded-3xl px-6 py-4 flex items-center gap-12">
        <div>
          <p className="text-gray-500 text-sm mb-1">Active Projects</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium text-gray-800">12</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl px-6 py-4 flex items-center gap-12">
        <div>
          <p className="text-gray-500 text-sm mb-1">Tasks completed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium text-gray-800">847</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl px-6 py-4 flex items-center gap-12">
        <div>
          <p className="text-gray-500 text-sm mb-1">On schedule</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium text-gray-800">94%</span>
            <TrendingUp className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
