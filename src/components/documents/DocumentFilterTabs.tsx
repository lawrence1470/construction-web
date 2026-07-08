'use client';

import { Box, Typography, alpha, useTheme } from '@mui/material';
import { SlidersHorizontal, X, SquareCheck, CircleDashed, CheckSquare, Hash, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/trpc/react';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import { useCsiName } from '@/lib/constants/useCsiData';
import { parseLocalDate } from '@/lib/utils/date';
import type { LinkFilter, AdvancedFilters } from '@/components/documents/DocumentFilterPopup';

const FOLDER_LABELS: Record<string, string> = {
  rfi: 'RFI',
  submittals: 'Submittals',
  'change-orders': 'Change Orders',
  photos: 'Photos',
  inspections: 'Inspections',
};

function formatDateRange(dateFrom: string | null, dateTo: string | null): string {
  const fmt = (s: string) => format(parseLocalDate(s), 'MMM d, yyyy');
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `After ${fmt(dateFrom)}`;
  if (dateTo) return `Before ${fmt(dateTo)}`;
  return '';
}

interface DocumentFilterTabsProps {
  selectedTypes: string[];
  linkFilter: LinkFilter;
  advanced: AdvancedFilters;
  unassignedCount?: number;
  onOpenPopup: (e: React.MouseEvent<HTMLElement>) => void;
  onRemoveType: (type: string) => void;
  onRemoveLinkFilter: () => void;
  onRemoveTask: () => void;
  onRemoveCsi: () => void;
  onRemoveDate: () => void;
  onToggleUnassigned?: () => void;
  isLoading?: boolean;
}

export default function DocumentFilterTabs({
  selectedTypes,
  linkFilter,
  advanced,
  unassignedCount = 0,
  onOpenPopup,
  onRemoveType,
  onRemoveLinkFilter,
  onRemoveTask,
  onRemoveCsi,
  onRemoveDate,
  onToggleUnassigned,
  isLoading,
}: DocumentFilterTabsProps) {
  const theme = useTheme();
  const { organizationId, projectId } = useProjectContext();

  const csiChipLabel = useCsiName(advanced.csiCode);
  const hasDate = !!(advanced.dateFrom || advanced.dateTo);
  const activeCount =
    selectedTypes.length +
    (linkFilter !== 'all' ? 1 : 0) +
    (advanced.taskId ? 1 : 0) +
    (advanced.csiCode ? 1 : 0) +
    (hasDate ? 1 : 0);
  const isUnassignedActive = linkFilter === 'unlinked';
  const showUnassignedChip = unassignedCount > 0 || isUnassignedActive;

  // Resolve the selected task's name for its chip label (cached with the popup's query).
  const { data: filterOptions } = api.document.filterOptions.useQuery(
    { organizationId, projectId },
    { enabled: !!advanced.taskId && !!organizationId && !!projectId, staleTime: 30_000 },
  );
  const taskName =
    filterOptions?.tasks.find((t) => t.id === advanced.taskId)?.name ?? 'Task';

  if (isLoading) {
    return <Box sx={{ mb: 2 }} />;
  }

  const activeChipSx = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    pl: '12px',
    pr: '10px',
    py: '6px',
    gap: '6px',
    bgcolor: 'secondary.main',
  } as const;

  const removeBtnSx = {
    display: 'flex',
    alignItems: 'center',
    border: 'none',
    bgcolor: 'transparent',
    cursor: 'pointer',
    p: 0,
    color: 'text.secondary',
    '&:hover': { color: 'text.primary' },
  } as const;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      {/* Filters trigger button */}
      <Box
        component="button"
        onClick={onOpenPopup}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          borderRadius: '999px',
          px: '14px',
          py: '7px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <SlidersHorizontal style={{ width: 14, height: 14, color: 'currentColor' }} />
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.primary' }}>
          Filters
        </Typography>
        {activeCount > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              borderRadius: '999px',
              bgcolor: 'primary.main',
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'primary.contrastText' }}>
              {activeCount}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Unassigned quick-filter chip — leading position so it's the first thing users see when there's a backlog */}
      {showUnassignedChip && onToggleUnassigned && (
        <Box
          component="button"
          onClick={onToggleUnassigned}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '999px',
            px: '12px',
            py: '6px',
            cursor: 'pointer',
            border: '1px dashed',
            borderColor: isUnassignedActive
              ? theme.palette.warning.main
              : alpha(theme.palette.warning.main, 0.4),
            bgcolor: isUnassignedActive
              ? alpha(theme.palette.warning.main, 0.16)
              : alpha(theme.palette.warning.main, 0.08),
            color: theme.palette.warning.dark,
            transition: 'all 0.15s',
            '&:hover': {
              bgcolor: alpha(theme.palette.warning.main, 0.16),
              borderColor: theme.palette.warning.main,
            },
          }}
        >
          <CircleDashed style={{ width: 12, height: 12 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'inherit' }}>
            Unassigned
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 18,
              height: 18,
              px: '5px',
              borderRadius: '999px',
              bgcolor: isUnassignedActive ? theme.palette.warning.main : alpha(theme.palette.warning.main, 0.18),
              color: isUnassignedActive
                ? theme.palette.getContrastText(theme.palette.warning.main)
                : theme.palette.warning.dark,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {unassignedCount}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Active document type chips */}
      {selectedTypes.map((type) => (
        <Box key={type} sx={activeChipSx}>
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.primary' }}>
            {FOLDER_LABELS[type] ?? type}
          </Typography>
          <Box
            component="button"
            onClick={() => onRemoveType(type)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              p: 0,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </Box>
        </Box>
      ))}

      {/* Active link filter chip — only shown for "linked"; "unlinked" uses the dedicated Unassigned chip above */}
      {linkFilter === 'linked' && (
        <Box sx={activeChipSx}>
          {linkFilter === 'linked' ? (
            <SquareCheck style={{ width: 12, height: 12, color: theme.palette.docExplorer.linkedGreen, flexShrink: 0 }} />
          ) : (
            <CircleDashed style={{ width: 12, height: 12, color: theme.palette.text.secondary, flexShrink: 0 }} />
          )}
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.primary' }}>
            {linkFilter === 'linked' ? 'Linked to Task' : 'Unlinked'}
          </Typography>
          <Box
            component="button"
            onClick={onRemoveLinkFilter}
            sx={{
              display: 'flex',
              alignItems: 'center',
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              p: 0,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </Box>
        </Box>
      )}

      {/* Task filter chip */}
      {advanced.taskId && (
        <Box sx={activeChipSx}>
          <CheckSquare style={{ width: 12, height: 12, color: theme.palette.docExplorer.linkedGreen, flexShrink: 0 }} />
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: 'text.primary',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {taskName}
          </Typography>
          <Box component="button" onClick={onRemoveTask} sx={removeBtnSx}>
            <X style={{ width: 12, height: 12 }} />
          </Box>
        </Box>
      )}

      {/* CSI code filter chip */}
      {advanced.csiCode && (
        <Box sx={activeChipSx}>
          <Hash style={{ width: 12, height: 12, color: theme.palette.text.secondary, flexShrink: 0 }} />
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: 'text.primary',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {csiChipLabel}
          </Typography>
          <Box component="button" onClick={onRemoveCsi} sx={removeBtnSx}>
            <X style={{ width: 12, height: 12 }} />
          </Box>
        </Box>
      )}

      {/* Date uploaded filter chip */}
      {hasDate && (
        <Box sx={activeChipSx}>
          <Calendar style={{ width: 12, height: 12, color: theme.palette.text.secondary, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.primary', whiteSpace: 'nowrap' }}>
            {formatDateRange(advanced.dateFrom, advanced.dateTo)}
          </Typography>
          <Box component="button" onClick={onRemoveDate} sx={removeBtnSx}>
            <X style={{ width: 12, height: 12 }} />
          </Box>
        </Box>
      )}
    </Box>
  );
}
