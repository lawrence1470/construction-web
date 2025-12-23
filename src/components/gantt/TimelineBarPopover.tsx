'use client';

import { memo, useCallback, useState } from 'react';
import { CalendarDays, MoreVertical, Trash2, ImagePlus, X, Clock } from 'lucide-react';
import type { GanttFeature } from '@/components/ui/gantt';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export interface TimelineBarPopoverProps {
  feature: GanttFeature;
  group: string;
  onCoverImageChange?: (featureId: string, coverImage: string | undefined) => void;
  onDelete?: (featureId: string) => void;
}

const TimelineBarPopover = memo(function TimelineBarPopover({
  feature,
  group,
  onCoverImageChange,
  onDelete,
}: TimelineBarPopoverProps) {
  const [isDragging, setIsDragging] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDuration = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const handleCoverImageChange = useCallback((imageUrl: string | undefined) => {
    onCoverImageChange?.(feature.id, imageUrl);
  }, [feature.id, onCoverImageChange]);

  const handleDelete = useCallback(() => {
    onDelete?.(feature.id);
  }, [feature.id, onDelete]);

  // Handle file drop/select for cover image
  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => handleCoverImageChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [handleCoverImageChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => handleCoverImageChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, [handleCoverImageChange]);

  // Calculate progress based on current date
  const calculateProgress = () => {
    const now = new Date();
    const start = feature.startAt;
    const end = feature.endAt;

    // If no dates set, return 0% progress
    if (!start || !end) return 0;

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.round((elapsed / total) * 100);
  };

  const progress = feature.progress ?? calculateProgress();

  return (
    <div className="w-[340px]">
      {/* Main Content Row - Square Image + Details */}
      <div className="flex gap-3 p-3">
        {/* Square Cover Image */}
        {feature.coverImage ? (
          <div className="relative group flex-shrink-0">
            <img
              src={feature.coverImage}
              alt="Cover"
              className="w-[100px] h-[100px] object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleCoverImageChange(undefined)}
              className="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <div
            className={`
              relative w-[100px] h-[100px] flex-shrink-0 rounded-lg border border-dashed transition-all cursor-pointer
              ${isDragging
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[var(--bg-input)]'
              }
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById(`cover-input-${feature.id}`)?.click()}
          >
            <input
              id={`cover-input-${feature.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <ImagePlus className="w-5 h-5 text-gray-400" />
              <span className="text-[10px] text-gray-400">Add cover</span>
            </div>
          </div>
        )}

        {/* Right Side Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title Row with Menu */}
          <div className="flex items-start gap-1.5">
            <h3 className="flex-1 font-semibold text-[14px] text-gray-900 dark:text-[var(--text-primary)] leading-tight line-clamp-2">
              {feature.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] rounded transition-colors flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem destructive onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Badge & Group */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
              style={{
                backgroundColor: `${feature.status.color}15`,
                color: feature.status.color,
              }}
            >
              {feature.status.name}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {group}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-auto pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Progress</span>
              <span
                className="text-[10px] font-bold"
                style={{ color: feature.status.color }}
              >
                {progress}%
              </span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: feature.status.color,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Footer */}
      {feature.startAt && feature.endAt && (
        <div className="px-3 py-2 border-t border-gray-100 dark:border-[var(--border-color)] bg-gray-50/50 dark:bg-[var(--bg-input)]/30 rounded-b-xl">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-[var(--text-secondary)]">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              <span>{formatDate(feature.startAt)} – {formatDate(feature.endAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{getDuration(feature.startAt, feature.endAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default TimelineBarPopover;
