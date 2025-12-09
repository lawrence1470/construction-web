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
    <div className="bg-white rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-800">Productivity Summary</h2>
          <p className="text-sm text-gray-500">Track team performance</p>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
            <Shuffle className="w-5 h-5 text-gray-600" />
          </button>
          <button className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer">
            <Maximize2 className="w-5 h-5 text-gray-600" />
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
              stroke="#f0f0f0"
              strokeWidth="0.5"
            />
          ))}

          {/* Line chart */}
          <polyline
            points={points}
            fill="none"
            stroke="#374151"
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
                  <circle cx={x} cy={y} r="3" fill="#374151" />
                  <rect x={x - 12} y={y - 25} width="24" height="16" rx="4" fill="#374151" />
                  <text x={x} y={y - 14} textAnchor="middle" fill="white" fontSize="8">
                    420
                  </text>
                </g>
              );
            }
            return null;
          })}
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 mt-2">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
        </div>
      </div>
    </div>
  );
}
