'use client';

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  FolderSimple,
  FolderOpen,
  Question,
  PaperPlaneTilt,
  PencilSimpleLine,
  Camera,
  ClipboardText,
  CaretDown,
  CaretRight,
  Plus,
  CheckCircle,
  Clock,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import type { Folder } from '@/lib/folders';
import type { DocumentItem, PreviewDoc, PreviewNav, FolderContentProps } from './types';
import BaseFolderContent from './BaseFolderContent';
import PhotosFolderContent from './PhotosFolderContent';
import TrackableFolderContent from './TrackableFolderContent';
import RequirementCounter from './RequirementCounter';

const folderIconMap: Record<string, PhosphorIcon> = {
  rfi: Question,
  submittals: PaperPlaneTilt,
  'change-orders': PencilSimpleLine,
  photos: Camera,
  inspections: ClipboardText,
};

const FOLDER_CONTENT_MAP: Record<string, React.ComponentType<FolderContentProps>> = {
  photos: PhotosFolderContent,
};

interface FolderRowProps {
  folder: Folder;
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  docs: DocumentItem[];
  onUpload: (folder: { id: string; name: string }, slotId?: string) => void;
  /**
   * Direct file upload bound to a specific slot in this folder — used by
   * per-slot drag-and-drop on trackable folders.
   */
  onUploadFile?: (folderId: string, slotId: string, file: File) => void;
  onSelectDoc: (doc: PreviewDoc, nav?: PreviewNav) => void;
  selectedDocId: string | null;
  // Tracking props (only used for trackable folders)
  required?: number | null;
  current?: number;
  approved?: number;
  pending?: number;
  canManage?: boolean;
  onSaveRequirement?: (count: number | null) => void;
  isRequirementPending?: boolean;
  // Task/org context (used by trackable folders for slot mutations)
  projectId?: string;
  taskId?: string;
  organizationId?: string;
  // Drawer launch (only for trackable folders)
  onManage?: () => void;
  // Approval context (only used by trackable folders)
  memberRole?: string;
  /** Slot ids currently uploading — forwarded to the trackable content. */
  uploadingSlotIds?: Set<string>;
}

function FolderRowInner({
  folder,
  isExpanded,
  onToggle,
  count,
  docs,
  onUpload,
  onUploadFile,
  onSelectDoc,
  selectedDocId,
  required,
  current,
  approved,
  pending,
  canManage,
  onSaveRequirement,
  isRequirementPending,
  projectId,
  taskId,
  organizationId,
  onManage,
  memberRole,
  uploadingSlotIds,
}: FolderRowProps) {
  const FolderIcon = folderIconMap[folder.id] ?? (isExpanded ? FolderOpen : FolderSimple);
  const isTrackable = folder.trackable && !!onSaveRequirement;

  const contentProps: FolderContentProps = {
    docs,
    onSelectDoc,
    selectedDocId,
    onUpload: (slotId?: string) => onUpload({ id: folder.id, name: folder.name }, slotId),
    onUploadFile: onUploadFile
      ? (slotId: string, file: File) => onUploadFile(folder.id, slotId, file)
      : undefined,
    folderName: folder.name,
    projectId,
    taskId,
    organizationId,
    memberRole,
    uploadingSlotIds,
  };

  const renderContent = () => {
    if (!isExpanded) return null;

    // Trackable folders (submittals, inspections) get numbered slot dropzones
    if (isTrackable) {
      const kind = folder.id === 'submittals' ? 'submittal' : folder.id === 'inspections' ? 'inspection' : undefined;
      return (
        <TrackableFolderContent
          {...contentProps}
          required={required ?? null}
          folderColor={folder.color}
          kind={kind}
        />
      );
    }

    const SpecificContent = FOLDER_CONTENT_MAP[folder.id];
    if (SpecificContent) {
      return <SpecificContent {...contentProps} />;
    }

    return <BaseFolderContent {...contentProps} />;
  };

  return (
    <Box>
      {/* Folder header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 0.75,
          py: 0.625,
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background-color 0.15s',
        }}
        onClick={onToggle}
      >
        {isExpanded ? (
          <CaretDown size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
        ) : (
          <CaretRight size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
        )}
        <FolderIcon size={14} color={folder.color} style={{ flexShrink: 0 }} />
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: isExpanded ? 600 : 450,
            color: 'text.primary',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {folder.name}
        </Typography>

        {/* Tracking indicator — inline in the header row */}
        {isTrackable && onManage ? (
          <ManageChipRow
            current={current ?? 0}
            approved={approved ?? 0}
            pending={pending ?? 0}
            required={required ?? null}
            folderColor={folder.color}
            onManage={onManage}
          />
        ) : isTrackable ? (
          <RequirementCounter
            current={current ?? 0}
            required={required ?? null}
            canManage={canManage ?? false}
            onSave={onSaveRequirement}
            isPending={isRequirementPending}
            folderColor={folder.color}
          />
        ) : (
          <>
            {/* Standard count badge for non-trackable folders */}
            {count > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  borderRadius: '999px',
                  bgcolor: 'action.selected',
                  px: 0.75,
                  ml: 'auto',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {count}
                </Typography>
              </Box>
            )}
          </>
        )}

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onUpload({ id: folder.id, name: folder.name });
          }}
          sx={{
            p: 0.5,
            width: 22,
            height: 22,
            color: 'text.disabled',
            flexShrink: 0,
            ...(!isTrackable && { ml: count > 0 ? 0 : 'auto' }),
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            transition: 'color 0.15s',
          }}
          aria-label={`Upload to ${folder.name}`}
        >
          <Plus size={13} />
        </IconButton>
      </Box>

      {/* Content area */}
      {renderContent()}
    </Box>
  );
}

const FolderRow = React.memo(FolderRowInner);
export default FolderRow;

/**
 * Inline progress + state-driven chip for trackable folder headers (admins).
 *
 * States derived from (required, approved, pending):
 *   - Not set up        → required is null/0          → row renders nothing
 *   - In progress       → uploads exist, not complete → progress segments + count
 *   - Pending review    → some uploads awaiting       → "N in review" indigo pill
 *   - Complete          → approved >= required         → ✓ next to count
 */
function ManageChipRow({
  current,
  approved,
  pending,
  required,
  folderColor,
  onManage,
}: {
  current: number;
  approved: number;
  pending: number;
  required: number | null;
  folderColor: string;
  onManage: () => void;
}) {
  const total = required ?? 0;
  const isComplete = total > 0 && approved >= total;
  const hasPending = pending > 0;

  // State 1 — Not set up: render a flex spacer so the trailing "+" upload
  // button stays right-aligned, matching non-trackable folder rows.
  if (total === 0) {
    return <Box sx={{ flex: 1 }} />;
  }

  // Segment fill rule (left-to-right):
  //   approved → solid green, pending → striped folder color, empty → muted
  const segmentFill = (i: number) => {
    if (i < approved) return { color: 'var(--status-green)', striped: false };
    if (i < approved + pending) return { color: folderColor, striped: true };
    return { color: 'var(--accent-subtle)', striped: false };
  };

  return (
    <Box
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      sx={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0, ml: 0.5 }}
    >
      <Box sx={{ display: 'flex', gap: '2px', flex: 1, alignItems: 'center', minWidth: 0 }}>
        {Array.from({ length: Math.min(total, 10) }).map((_, i) => {
          const fill = segmentFill(i);
          return (
            <Box
              key={i}
              sx={{
                height: 3.5,
                flex: 1,
                maxWidth: 16,
                borderRadius: '1.5px',
                bgcolor: fill.striped ? 'transparent' : fill.color,
                background: fill.striped
                  ? `repeating-linear-gradient(135deg, ${fill.color} 0, ${fill.color} 2.5px, ${fill.color}55 2.5px, ${fill.color}55 5px)`
                  : undefined,
                transition: 'background-color 0.3s ease, background 0.3s ease',
              }}
            />
          );
        })}
        {total > 10 && (
          <Typography sx={{ fontSize: '0.5rem', color: 'text.disabled', lineHeight: 1, flexShrink: 0 }}>
            +{total - 10}
          </Typography>
        )}
      </Box>

      {/* Count + completion check (clickable in complete state) */}
      {isComplete ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <Typography
            component="button"
            onClick={onManage}
            sx={{
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: 'success.main',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.01em',
              border: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              cursor: 'pointer',
              p: 0,
              transition: 'color 0.15s',
              '&:hover': { color: 'success.dark' },
            }}
            aria-label="Manage requirements"
          >
            {approved}/{total}
          </Typography>
          <CheckCircle size={11} weight="fill" color="var(--status-green)" />
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: '0.5625rem',
            fontWeight: 600,
            color: 'text.secondary',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
        >
          {current}/{total}
        </Typography>
      )}

      {/* Trailing status pill — only shown when items are awaiting approval. */}
      {!isComplete && hasPending && (
        <ChipButton
          color="#4f46e5"
          onClick={onManage}
          ariaLabel={`${pending} awaiting approval`}
        >
          <Clock size={10} weight="bold" />
          {pending} in review
        </ChipButton>
      )}
    </Box>
  );
}

function ChipButton({
  color,
  onClick,
  ariaLabel,
  children,
}: {
  color: string;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        py: '2px',
        px: '6px',
        borderRadius: '5px',
        border: '1px solid transparent',
        bgcolor: `${color}14`,
        color,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.5625rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        flexShrink: 0,
        transition: 'background-color 0.15s, border-color 0.15s',
        '&:hover': { bgcolor: `${color}25`, borderColor: color },
      }}
      aria-label={ariaLabel}
    >
      {children}
    </Box>
  );
}
