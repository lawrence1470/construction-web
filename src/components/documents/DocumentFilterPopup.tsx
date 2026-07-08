'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Popover, TextField, MenuItem, useTheme } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import { api } from '@/trpc/react';
import { formatCsiCodeWith } from '@/lib/constants/csiCodes';
import { useCsiData } from '@/lib/constants/useCsiData';
import { parseLocalDate } from '@/lib/utils/date';

const FOLDER_FILTERS = [
  { value: 'rfi', label: 'RFI' },
  { value: 'submittals', label: 'Submittals' },
  { value: 'change-orders', label: 'Change Orders' },
  { value: 'photos', label: 'Photos' },
  { value: 'inspections', label: 'Inspections' },
];

const LINK_FILTERS = [
  { value: 'linked', label: 'Linked to Task' },
  { value: 'unlinked', label: 'Unlinked' },
];

export type LinkFilter = 'all' | 'linked' | 'unlinked';

export interface AdvancedFilters {
  taskId: string | null;
  csiCode: string | null;
  dateFrom: string | null; // yyyy-MM-dd
  dateTo: string | null; // yyyy-MM-dd
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  taskId: null,
  csiCode: null,
  dateFrom: null,
  dateTo: null,
};

export interface DocumentFilterPopupProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  organizationId: string;
  projectId: string;
  selectedTypes: string[];
  linkFilter: LinkFilter;
  advanced: AdvancedFilters;
  onClose: () => void;
  onApply: (types: string[], link: LinkFilter, advanced: AdvancedFilters) => void;
}

export default function DocumentFilterPopup({
  open,
  anchorEl,
  organizationId,
  projectId,
  selectedTypes,
  linkFilter,
  advanced,
  onClose,
  onApply,
}: DocumentFilterPopupProps) {
  const theme = useTheme();
  const [pendingTypes, setPendingTypes] = useState<string[]>(selectedTypes);
  const [pendingLink, setPendingLink] = useState<LinkFilter>(linkFilter);
  const [pendingAdvanced, setPendingAdvanced] = useState<AdvancedFilters>(advanced);

  const { data: filterOptions } = api.document.filterOptions.useQuery(
    { organizationId, projectId },
    { enabled: open && !!organizationId && !!projectId, staleTime: 30_000 },
  );
  const taskOptions = filterOptions?.tasks ?? [];
  const csiOptions = filterOptions?.csiCodes ?? [];
  const csiData = useCsiData();

  // Sync pending state when popup opens
  useEffect(() => {
    if (open) {
      setPendingTypes(selectedTypes);
      setPendingLink(linkFilter);
      setPendingAdvanced(advanced);
    }
  }, [open, selectedTypes, linkFilter, advanced]);

  const toggleType = (value: string) => {
    if (value === 'all') {
      setPendingTypes([]);
      return;
    }
    setPendingTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  };

  const isTypeActive = (value: string) => {
    if (value === 'all') return pendingTypes.length === 0;
    return pendingTypes.includes(value);
  };

  const handleClearAll = () => {
    setPendingTypes([]);
    setPendingLink('all');
    setPendingAdvanced(EMPTY_ADVANCED_FILTERS);
  };

  const handleApply = () => {
    onApply(pendingTypes, pendingLink, pendingAdvanced);
    onClose();
  };

  const activeChip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '8px',
    px: '10px',
    py: '6px',
    bgcolor: 'primary.main',
    border: '1px solid',
    borderColor: 'primary.main',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    '&:hover': { opacity: 0.85 },
  } as const;

  const inactiveChip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '8px',
    px: '10px',
    py: '6px',
    bgcolor: 'secondary.main',
    border: '1px solid',
    borderColor: 'divider',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    '&:hover': { opacity: 0.7 },
  } as const;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            width: 340,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0px 8px 24px -2px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            mt: '6px',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: '14px',
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
          Filter Documents
        </Typography>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            border: 'none',
            bgcolor: 'transparent',
            cursor: 'pointer',
            color: 'text.secondary',
            borderRadius: '6px',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </Box>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* Document Type */}
      <Box sx={{ px: 2, py: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Document Type
        </Typography>
        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {/* All chip */}
          <Box
            component="button"
            onClick={() => toggleType('all')}
            sx={isTypeActive('all') ? activeChip : inactiveChip}
          >
            {isTypeActive('all') && (
              <Check style={{ width: 11, height: 11, flexShrink: 0, color: theme.palette.primary.contrastText }} />
            )}
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: isTypeActive('all') ? 600 : 500,
                color: isTypeActive('all') ? 'primary.contrastText' : 'text.primary',
              }}
            >
              All
            </Typography>
          </Box>
          {FOLDER_FILTERS.map((filter) => {
            const active = isTypeActive(filter.value);
            return (
              <Box
                key={filter.value}
                component="button"
                onClick={() => toggleType(filter.value)}
                sx={active ? activeChip : inactiveChip}
              >
                {active && (
                  <Check style={{ width: 11, height: 11, flexShrink: 0, color: theme.palette.primary.contrastText }} />
                )}
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {filter.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* Link Status */}
      <Box sx={{ px: 2, py: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Link Status
        </Typography>
        <Box sx={{ display: 'flex', gap: '6px' }}>
          {LINK_FILTERS.map((filter) => {
            const active = pendingLink === filter.value;
            return (
              <Box
                key={filter.value}
                component="button"
                onClick={() => setPendingLink(active ? 'all' : (filter.value as LinkFilter))}
                sx={active ? activeChip : inactiveChip}
              >
                {active && (
                  <Check style={{ width: 11, height: 11, flexShrink: 0, color: theme.palette.primary.contrastText }} />
                )}
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {filter.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* Task */}
      <Box sx={{ px: 2, py: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Task
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          value={pendingAdvanced.taskId ?? ''}
          onChange={(e) =>
            setPendingAdvanced((p) => ({ ...p, taskId: e.target.value || null }))
          }
          slotProps={{ select: { displayEmpty: true } }}
          sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
        >
          <MenuItem value="" sx={{ fontSize: 13 }}>
            All tasks
          </MenuItem>
          {taskOptions.map((t) => (
            <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* CSI Code */}
      <Box sx={{ px: 2, py: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          CSI Code
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          value={pendingAdvanced.csiCode ?? ''}
          onChange={(e) =>
            setPendingAdvanced((p) => ({ ...p, csiCode: e.target.value || null }))
          }
          slotProps={{ select: { displayEmpty: true } }}
          sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
        >
          <MenuItem value="" sx={{ fontSize: 13 }}>
            All codes
          </MenuItem>
          {csiOptions.map((code) => (
            <MenuItem key={code} value={code} sx={{ fontSize: 13 }}>
              {formatCsiCodeWith(csiData, code)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* Date Uploaded */}
      <Box sx={{ px: 2, py: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Date Uploaded
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <DatePicker
            label="From"
            value={pendingAdvanced.dateFrom ? parseLocalDate(pendingAdvanced.dateFrom) : null}
            maxDate={pendingAdvanced.dateTo ? parseLocalDate(pendingAdvanced.dateTo) : undefined}
            onChange={(d) =>
              setPendingAdvanced((p) => ({
                ...p,
                dateFrom: d ? format(d, 'yyyy-MM-dd') : null,
              }))
            }
            slotProps={{
              textField: { size: 'small', fullWidth: true },
              field: { clearable: true },
            }}
          />
          <DatePicker
            label="To"
            value={pendingAdvanced.dateTo ? parseLocalDate(pendingAdvanced.dateTo) : null}
            minDate={pendingAdvanced.dateFrom ? parseLocalDate(pendingAdvanced.dateFrom) : undefined}
            onChange={(d) =>
              setPendingAdvanced((p) => ({
                ...p,
                dateTo: d ? format(d, 'yyyy-MM-dd') : null,
              }))
            }
            slotProps={{
              textField: { size: 'small', fullWidth: true },
              field: { clearable: true },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ height: '1px', bgcolor: 'divider', flexShrink: 0 }} />

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: '12px',
        }}
      >
        <Box
          component="button"
          onClick={handleClearAll}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderRadius: '8px',
            border: 'none',
            bgcolor: 'transparent',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
            Clear All
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              py: 1,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'transparent',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
              Cancel
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={handleApply}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              px: '20px',
              py: 1,
              borderRadius: '8px',
              border: 'none',
              bgcolor: 'primary.main',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              '&:hover': { opacity: 0.9 },
            }}
          >
            <SlidersHorizontal style={{ width: 12, height: 12, color: theme.palette.primary.contrastText }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'primary.contrastText' }}>
              Apply
            </Typography>
          </Box>
        </Box>
      </Box>
    </Popover>
  );
}
