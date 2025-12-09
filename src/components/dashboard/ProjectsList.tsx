'use client';

import { Maximize2, CheckCircle2 } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/ImageWithFallback';

const projects = [
  {
    id: '1',
    name: 'Downtown Tower Construction',
    description: 'Steel & concrete framework',
    timeframe: 'Today 08:00 AM - 03:00 PM',
    completed: true,
    assignees: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    ],
  },
  {
    id: '2',
    name: 'Residential Complex Phase 2',
    description: 'Interior finishing work',
    timeframe: 'Today 09:00 AM - 05:00 PM',
    completed: false,
    assignees: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    ],
  },
];

export default function ProjectsList() {
  return (
    <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-800 dark:text-[var(--text-primary)]">Active Projects</h2>
          <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">Wednesday, 11 May</p>
        </div>
        <button className="w-10 h-10 bg-gray-100 dark:bg-[var(--bg-input)] rounded-2xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
          <Maximize2 className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
        </button>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="border-b border-gray-100 dark:border-[var(--border-color)] pb-4 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className={`text-gray-800 dark:text-[var(--text-primary)] mb-1 ${project.completed ? 'line-through' : ''}`}>
                  {project.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">{project.description}</p>
              </div>
              {project.completed && (
                <div className="w-8 h-8 bg-[#c8d97e] dark:bg-[#a8b95e] rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-gray-700 dark:text-gray-900" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">{project.timeframe}</p>
              <div className="flex -space-x-2">
                {project.assignees.map((avatar, idx) => (
                  <div key={idx} className="w-7 h-7 rounded-full overflow-hidden border-2 border-white dark:border-[var(--bg-card)]">
                    <ImageWithFallback
                      src={avatar}
                      alt="Team member"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
