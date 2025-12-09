'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useMouse, useThrottle, useWindowScroll } from '@uidotdev/usehooks';
import { addDays, format, formatDate, formatDistance, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, TrashIcon } from 'lucide-react';
import {
  useContext,
  useId,
  useState,
  useEffect,
} from 'react';
import type {
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
} from 'react';

// Import types from extracted modules
import type {
  GanttFeature,
  GanttMarkerProps,
  Range,
} from './gantt/types';

// Import utility functions from extracted modules
import {
  getDateByMousePosition,
  getOffset,
} from './gantt/utils';

// Import context from extracted modules
import {
  GanttContext,
  GanttProvider,
  useGanttDragging,
  useGanttScrollX,
  useGanttDropTarget,
} from './gantt/context';

// Import extracted components
import {
  GanttFeatureItem,
  GanttFeatureItemCard,
  GanttFeatureDragHelper,
} from './gantt/components';

// Re-export types for backwards compatibility
export type {
  GanttStatus,
  GanttFeature,
  GanttMarkerProps,
  Range,
  TimelineData,
  GanttContextProps,
} from './gantt/types';

// Re-export context exports for backwards compatibility
export { GanttProvider, useGanttDragging, useGanttScrollX, useGanttDropTarget } from './gantt/context';
export type { GanttProviderProps } from './gantt/context';

// Re-export extracted components for backwards compatibility
export { GanttFeatureItem, GanttFeatureItemCard, GanttFeatureDragHelper } from './gantt/components';
export type {
  GanttFeatureItemProps,
  GanttFeatureItemCardProps,
  GanttFeatureDragHelperProps,
} from './gantt/components';

export type GanttContentHeaderProps = {
  renderHeaderItem: (index: number) => ReactNode;
  title: string;
  columns: number;
};

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({
  title,
  columns,
  renderHeaderItem,
}) => {
  const id = useId();

  return (
    <div
      className="sticky top-0 z-20 grid w-full shrink-0 bg-white"
      style={{ height: 'var(--gantt-header-height)' }}
    >
      <div>
        <div
          className="sticky inline-flex whitespace-nowrap px-3 py-2 text-gray-600 text-xs"
          style={{
            left: 'var(--gantt-sidebar-width)',
          }}
        >
          <p>{title}</p>
        </div>
      </div>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`${id}-${index}`}
            className="shrink-0 border-gray-200 border-b py-1 text-center text-xs"
          >
            {renderHeaderItem(index)}
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters
      .flatMap((quarter) => quarter.months)
      .map((month, index) => (
        <div className="relative flex flex-col" key={`${year.year}-${index}`}>
          <GanttContentHeader
            title={format(new Date(year.year, index, 1), 'MMMM yyyy')}
            columns={month.days}
            renderHeaderItem={(item: number) => (
              <div className="flex items-center justify-center gap-1">
                <p>
                  {format(addDays(new Date(year.year, index, 1), item), 'd')}
                </p>
                <p className="text-gray-500">
                  {format(
                    addDays(new Date(year.year, index, 1), item),
                    'EEEEE'
                  )}
                </p>
              </div>
            )}
          />
          <GanttColumns
            columns={month.days}
            isColumnSecondary={(item: number) =>
              [0, 6].includes(
                addDays(new Date(year.year, index, 1), item).getDay()
              )
            }
          />
        </div>
      ))
  );
};

const MonthlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) => (
    <div className="relative flex flex-col" key={year.year}>
      <GanttContentHeader
        title={`${year.year}`}
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
        renderHeaderItem={(item: number) => (
          <p>{format(new Date(year.year, item, 1), 'MMM')}</p>
        )}
      />
      <GanttColumns
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
      />
    </div>
  ));
};

const QuarterlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters.map((quarter, quarterIndex) => (
      <div
        className="relative flex flex-col"
        key={`${year.year}-${quarterIndex}`}
      >
        <GanttContentHeader
          title={`Q${quarterIndex + 1} ${year.year}`}
          columns={quarter.months.length}
          renderHeaderItem={(item: number) => (
            <p>
              {format(new Date(year.year, quarterIndex * 3 + item, 1), 'MMM')}
            </p>
          )}
        />
        <GanttColumns columns={quarter.months.length} />
      </div>
    ))
  );
};

const headers: Record<Range, FC> = {
  daily: DailyHeader,
  monthly: MonthlyHeader,
  quarterly: QuarterlyHeader,
};

export type GanttHeaderProps = {
  className?: string;
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useContext(GanttContext);
  const Header = headers[gantt.range];

  return (
    <div
      className={cn(
        '-space-x-px flex h-full w-max divide-x divide-border/50',
        className
      )}
    >
      <Header />
    </div>
  );
};

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelectItem?: (id: string) => void;
  className?: string;
  isFullscreen?: boolean;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelectItem,
  className,
  isFullscreen = false,
}) => {
  const tempEndAt =
    feature.endAt && isSameDay(feature.startAt, feature.endAt)
      ? addDays(feature.endAt, 1)
      : feature.endAt;
  const duration = tempEndAt
    ? formatDistance(feature.startAt, tempEndAt)
    : `${formatDistance(feature.startAt, new Date())} so far`;

  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      onSelectItem?.(feature.id);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Enter') {
      onSelectItem?.(feature.id);
    }
  };

  return (
    <motion.div
      // biome-ignore lint/a11y/useSemanticElements: <explanation>
      role="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      key={feature.id}
      className={cn(
        'relative flex items-center gap-2.5 p-2.5 text-xs cursor-pointer',
        isFullscreen && 'flex-1',
        className
      )}
      style={isFullscreen ? undefined : {
        height: 'var(--gantt-row-height)',
      }}
      whileHover={{
        backgroundColor: 'rgba(243, 244, 246, 0.8)',
        transition: { duration: 0.15 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: feature.status.color,
        }}
        whileHover={{ scale: 1.3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">
        {feature.name}
      </p>
      <p className="pointer-events-none text-gray-500">{duration}</p>
    </motion.div>
  );
};

export const GanttSidebarHeader: FC = () => (
  <div
    className="sticky top-0 z-10 flex shrink-0 items-end border-gray-200 border-b bg-white font-medium text-gray-600 text-xs"
    style={{ height: 'var(--gantt-header-height)' }}
  >
    <p className="w-[100px] shrink-0 truncate p-2.5 text-left border-r border-gray-200">Groups</p>
    <div className="flex flex-1 items-end justify-between gap-2.5 p-2.5">
      <p className="flex-1 truncate text-left">Issues</p>
      <p className="shrink-0">Duration</p>
    </div>
  </div>
);

export type GanttSidebarGroupProps = {
  children: ReactNode;
  name: string;
  taskCount?: number;
  className?: string;
  isFullscreen?: boolean;
};

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({
  children,
  name,
  taskCount = 1,
  className,
  isFullscreen = false,
}) => (
  <div className={cn('flex', isFullscreen && 'flex-1', className)}>
    {/* Group name column - spans all task rows */}
    <div
      className={cn(
        'w-[100px] shrink-0 border-r border-gray-200 flex items-center',
        isFullscreen && 'h-full'
      )}
      style={isFullscreen ? undefined : { height: `calc(${taskCount} * var(--gantt-row-height))` }}
    >
      <p className="w-full truncate p-2.5 text-left font-medium text-gray-600 text-xs">
        {name}
      </p>
    </div>
    {/* Tasks column */}
    <div className={cn(
      'flex-1 divide-y divide-gray-200',
      isFullscreen && 'flex flex-col'
    )}>{children}</div>
  </div>
);

export type GanttSidebarProps = {
  children: ReactNode;
  className?: string;
  isFullscreen?: boolean;
};

export const GanttSidebar: FC<GanttSidebarProps> = ({
  children,
  className,
  isFullscreen = false,
}) => (
  <div
    data-roadmap-ui="gantt-sidebar"
    className={cn(
      'sticky left-0 z-30 overflow-clip border-gray-200 border-r bg-white',
      isFullscreen ? 'h-full flex flex-col' : 'h-max min-h-full',
      className
    )}
  >
    <GanttSidebarHeader />
    <div className={cn(
      'divide-y divide-gray-200',
      isFullscreen && 'flex-1 overflow-auto flex flex-col'
    )}>{children}</div>
  </div>
);

export type GanttAddFeatureHelperProps = {
  top: number;
  rowIndex?: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({
  top,
  rowIndex,
  className,
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();

  const handleClick = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);

    gantt.onAddItem?.(currentDate);
  };

  return (
    <div
      className={cn('absolute top-0 w-full', className)}
      style={{
        height: gantt.rowHeight,
        transform: `translateY(${top}px)`,
      }}
      ref={mouseRef}
    >
      <button
        onClick={handleClick}
        type="button"
        className="flex h-full w-full items-center justify-center bg-blue-50/50 border border-dashed border-blue-300 transition-colors hover:bg-blue-100/50"
      >
        <PlusIcon
          size={16}
          className="pointer-events-none select-none text-blue-400"
        />
      </button>
    </div>
  );
};

export type GanttColumnProps = {
  index: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumn: FC<GanttColumnProps> = ({
  index,
  isColumnSecondary,
}) => {
  const gantt = useContext(GanttContext);
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);

  // Calculate raw position
  const rawTop = mousePosition.y -
    (mouseRef.current?.getBoundingClientRect().y ?? 0) -
    (windowScroll.y ?? 0);

  // Snap to row grid - calculate which row the mouse is in and snap to that row's top
  const rowIndex = Math.floor(rawTop / gantt.rowHeight);
  const snappedTop = rowIndex * gantt.rowHeight;

  return (
    // biome-ignore lint/nursery/noStaticElementInteractions: <explanation>
    <div
      className={cn(
        'group relative h-full overflow-hidden',
        isColumnSecondary?.(index) ? 'bg-secondary' : ''
      )}
      ref={mouseRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!dragging && hovering && gantt.onAddItem ? (
        <GanttAddFeatureHelper top={snappedTop} rowIndex={rowIndex} />
      ) : null}
    </div>
  );
};

export type GanttColumnsProps = {
  columns: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumns: FC<GanttColumnsProps> = ({
  columns,
  isColumnSecondary,
}) => {
  const id = useId();

  return (
    <div
      className="divide grid h-full w-full divide-x divide-gray-200"
      style={{
        gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
      }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <GanttColumn
          key={`${id}-${index}`}
          index={index}
          isColumnSecondary={isColumnSecondary}
        />
      ))}
    </div>
  );
};

export type GanttCreateMarkerTriggerProps = {
  onCreateMarker: (date: Date) => void;
  className?: string;
};

export const GanttCreateMarkerTrigger: FC<GanttCreateMarkerTriggerProps> = ({
  onCreateMarker,
  className,
}) => {
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [windowScroll] = useWindowScroll();
  const x = useThrottle(
    mousePosition.x -
      (mouseRef.current?.getBoundingClientRect().x ?? 0) -
      (windowScroll.x ?? 0),
    10
  );

  const date = getDateByMousePosition(gantt, x);

  const handleClick = () => onCreateMarker(date);

  return (
    <div
      className={cn(
        'group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible',
        className
      )}
      ref={mouseRef}
    >
      <div
        className="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100"
        style={{ transform: `translateX(${x}px)` }}
      >
        <button
          type="button"
          className="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white border border-gray-200"
          onClick={handleClick}
        >
          <PlusIcon size={12} className="text-gray-500" />
        </button>
        <div className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-900 text-xs">
          {formatDate(date, 'MMM dd, yyyy')}
        </div>
      </div>
    </div>
  );
};

export type GanttDropZoneIndicatorProps = {
  className?: string;
};

export const GanttDropZoneIndicator: FC<GanttDropZoneIndicatorProps> = ({
  className,
}) => {
  const [dropTarget] = useGanttDropTarget();
  const gantt = useContext(GanttContext);

  return (
    <AnimatePresence>
      {dropTarget && (
        <motion.div
          className={cn(
            'pointer-events-none absolute z-40',
            'bg-blue-100/80 border-2 border-blue-400 border-dashed rounded-md',
            className
          )}
          style={{
            height: gantt.rowHeight - 4,
            top: dropTarget.rowIndex * gantt.rowHeight + gantt.headerHeight + 2,
            left: Math.round(dropTarget.offset),
            width: Math.round(dropTarget.width),
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: 1,
            boxShadow: [
              '0 0 0 0 rgba(59, 130, 246, 0)',
              '0 0 0 3px rgba(59, 130, 246, 0.2)',
              '0 0 0 0 rgba(59, 130, 246, 0)'
            ]
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.15,
            boxShadow: { duration: 1, repeat: Infinity }
          }}
        />
      )}
    </AnimatePresence>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => (
  <div className={className}>
    {children}
  </div>
);

export type GanttRowGridProps = {
  totalRows: number;
  taskRowIndices?: number[]; // Row indices that are actual tasks (not group headers)
  className?: string;
};

export const GanttRowGrid: FC<GanttRowGridProps> = ({ totalRows, taskRowIndices, className }) => {
  const gantt = useContext(GanttContext);
  const id = useId();

  // If taskRowIndices provided, only render those rows; otherwise render all
  const rowsToRender = taskRowIndices ?? Array.from({ length: totalRows }, (_, i) => i);

  return (
    <div
      className={cn('absolute top-0 left-0 w-full pointer-events-none', className)}
      style={{
        marginTop: 'var(--gantt-header-height)',
        height: `calc(${totalRows} * var(--gantt-row-height))`,
      }}
    >
      {rowsToRender.map((rowIndex) => (
        <div
          key={`${id}-row-${rowIndex}`}
          className="absolute left-0 w-full border-b border-gray-200"
          style={{
            top: `calc(${rowIndex + 1} * var(--gantt-row-height))`,
          }}
        />
      ))}
    </div>
  );
};

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  className,
  children,
}) => (
  <div
    className={cn('absolute top-0 left-0 h-full w-max', className)}
    style={{ marginTop: 'var(--gantt-header-height)' }}
  >
    {children}
  </div>
);

export const GanttMarker: FC<
  GanttMarkerProps & {
    onRemove?: (id: string) => void;
    className?: string;
  }
> = ({ label, date, id, onRemove, className }) => {
  const gantt = useContext(GanttContext);
  // Use same getOffset function as GanttFeatureItem for consistency
  const timelineYear = gantt.timelineData.at(0)?.year ?? date.getFullYear();
  const timelineStartDate = new Date(timelineYear, 0, 1);
  const offset = getOffset(date, timelineStartDate, gantt);
  const handleRemove = () => onRemove?.(id);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(${offset}px)`,
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-white border border-gray-200 px-2 py-1 text-gray-900 text-xs',
              className
            )}
          >
            {label}
            <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
              {formatDate(date, 'MMM dd, yyyy')}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRemove ? (
            <ContextMenuItem
              className="flex items-center gap-2 text-destructive"
              onClick={handleRemove}
            >
              <TrashIcon size={16} />
              Remove marker
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <div className={cn('h-full w-px bg-gray-300', className)} />
    </div>
  );
};

export type GanttTimelineProps = {
  children: ReactNode;
  className?: string;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'relative flex h-full w-max flex-none overflow-clip',
      className
    )}
  >
    {children}
  </div>
);

export type GanttTodayProps = {
  className?: string;
};

export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const label = 'Today';
  const gantt = useContext(GanttContext);
  const [offset, setOffset] = useState(0);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Calculate offset on client-side only to avoid hydration mismatch
  useEffect(() => {
    const date = new Date();
    setCurrentDate(date);
    const timelineYear = gantt.timelineData.at(0)?.year ?? date.getFullYear();
    const timelineStartDate = new Date(timelineYear, 0, 1);
    const calculatedOffset = getOffset(date, timelineStartDate, gantt);
    setOffset(calculatedOffset);
  }, [gantt]);

  // Don't render until client-side calculation is done
  if (currentDate === null) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute top-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        left: `${offset}px`,
      }}
    >
      <div
        className={cn(
          'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-blue-500 border border-blue-600 px-2 py-1 text-white text-xs font-medium shadow-md hover:scale-105 transition-transform',
          className
        )}
      >
        {label}
        <span className="max-h-[0] overflow-hidden opacity-90 transition-all group-hover:max-h-[2rem]">
          {formatDate(currentDate, 'MMM dd, yyyy')}
        </span>
      </div>
      <div className="h-full w-0.5 bg-blue-500" />
    </div>
  );
};
