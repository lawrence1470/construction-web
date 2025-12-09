'use client';

import { Maximize2, Shuffle } from 'lucide-react';

export default function TeamActivity() {
  const data = [
    { x: 0, y: 280 },
    { x: 1, y: 320 },
    { x: 2, y: 350 },
    { x: 3, y: 310 },
    { x: 4, y: 360 },
    { x: 5, y: 340 },
    { x: 6, y: 385 },
    { x: 7, y: 370 },
    { x: 8, y: 320 },
    { x: 9, y: 350 },
    { x: 10, y: 390 },
    { x: 11, y: 420 },
  ];

  const maxY = 450;
  const minY = 250;
  const width = 100;
  const height = 150;

  const points = data
    .map((point, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((point.y - minY) / (maxY - minY)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-800 dark:text-[var(--text-primary)]">Productivity Summary</h2>
          <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">Track team performance</p>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-gray-100 dark:bg-[var(--bg-input)] rounded-2xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <Shuffle className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
          </button>
          <button className="w-10 h-10 bg-gray-100 dark:bg-[var(--bg-input)] rounded-2xl flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
            <Maximize2 className="w-5 h-5 text-gray-600 dark:text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="relative h-40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1="0"
              y1={i * (height / 3)}
              x2={width}
              y2={i * (height / 3)}
              className="stroke-gray-100 dark:stroke-[var(--border-color)]"
              strokeWidth="0.5"
            />
          ))}

          {/* Line chart */}
          <polyline
            points={points}
            fill="none"
            className="stroke-gray-700 dark:stroke-purple-400"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {data.map((point, idx) => {
            const x = (idx / (data.length - 1)) * width;
            const y = height - ((point.y - minY) / (maxY - minY)) * height;

            // Highlight the peak
            if (idx === 11) {
              return (
                <g key={idx}>
                  <circle cx={x} cy={y} r="3" className="fill-gray-700 dark:fill-purple-400" />
                  <rect x={x - 12} y={y - 25} width="24" height="16" rx="4" className="fill-gray-700 dark:fill-purple-600" />
                  <text x={x} y={y - 14} textAnchor="middle" fill="white" fontSize="8">
                    420
                  </text>
                </g>
              );
            }
            return null;
          })}
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 dark:text-[var(--text-muted)] mt-2">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
        </div>
      </div>
    </div>
  );
}
