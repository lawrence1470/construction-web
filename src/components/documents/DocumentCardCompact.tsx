'use client';

import { useState } from 'react';
import { Box, Typography, Tooltip, useTheme, alpha } from '@mui/material';
import {
  DownloadSimple,
  Trash,
  FileText,
  FileXls,
  CheckSquare,
  CircleDashed,
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/utils/formatting';
import { getCategoryLabel } from '@/lib/constants/documentCategories';
import { isApprovableFolder } from '@/lib/folders';
import { useOrgContext } from '@/components/providers/OrgProvider';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import ApprovalToggle from '@/components/approvals/ApprovalToggle';
import DeleteDocumentDialog from './DeleteDocumentDialog';
import DocumentThumbnail from './DocumentThumbnail';
import type { DocumentResult } from './types';

interface DocumentCardCompactProps {
  doc: DocumentResult;
  organizationId: string;
  onPreview: () => void;
}

/**
 * Option C: "Two-Line Compact" — Balanced
 * Small square thumbnail (48×48) on the left. Row 1: filename + category badge.
 * Row 2: date · size · uploader · task status. Actions on hover.
 */
export default function DocumentCardCompact({ doc, organizationId, onPreview }: DocumentCardCompactProps) {
  const theme = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isUnassigned = !doc.taskId;
  const categoryLabel = getCategoryLabel(doc.folderId);
  const { memberRole } = useOrgContext();
  const { projectId } = useProjectContext();
  const showApproval = isApprovableFolder(doc.folderId);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPreview}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPreview();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: '14px',
        py: '10px',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: hovered ? alpha(theme.palette.primary.main, 0.3) : 'divider',
        borderLeft: isUnassigned ? `3px solid ${theme.palette.warning.main}` : undefined,
        pl: isUnassigned ? '12px' : '14px',
        bgcolor: 'background.paper',
        transition: 'border-color 0.2s, background-color 0.15s, transform 0.18s ease, box-shadow 0.18s ease',
        cursor: 'pointer',
        willChange: 'transform',
        boxShadow: 'var(--shadow-card)',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-card-hover)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '8px',
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <DocumentThumbnail
          url={doc.blobUrl}
          mimeType={doc.mimeType}
          name={doc.name}
          renderWidth={140}
          fallback={
            doc.mimeType.includes('spreadsheet') || doc.mimeType.includes('excel') || doc.mimeType === 'text/csv'
              ? <FileXls size={20} color={theme.palette.text.disabled} />
              : <FileText size={20} color={theme.palette.text.disabled} />
          }
        />
      </Box>

      {/* Text content */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Row 1: name + badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {doc.name}
          </Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '4px',
              bgcolor: 'docExplorer.badgeBg',
              px: '6px',
              py: '2px',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1, color: 'text.secondary' }}>
              {categoryLabel}
            </Typography>
          </Box>
        </Box>

        {/* Row 2: meta */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.secondary' }}>
            {format(new Date(doc.createdAt), 'MMM d, yyyy')}
          </Typography>
          <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.disabled' }}>·</Typography>
          <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.secondary' }}>
            {formatFileSize(doc.size)}
          </Typography>
          {doc.uploadedBy.name && (
            <>
              <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.disabled' }}>·</Typography>
              <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.secondary' }}>
                {doc.uploadedBy.name}
              </Typography>
            </>
          )}
          <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.disabled' }}>·</Typography>
          {doc.taskId ? (
            <Tooltip title={doc.task?.name ?? 'Linked to a task'} placement="top" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, maxWidth: 180 }}>
                <CheckSquare size={10} color={theme.palette.docExplorer.linkedGreen} style={{ flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1,
                    color: 'docExplorer.linkedGreen',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doc.task?.name ?? 'Linked'}
                </Typography>
              </Box>
            </Tooltip>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                px: '6px',
                py: '2px',
                borderRadius: '4px',
                border: '1px dashed',
                borderColor: alpha(theme.palette.warning.main, 0.4),
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                color: theme.palette.warning.dark,
              }}
            >
              <CircleDashed size={9} />
              <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1, color: 'inherit' }}>
                Unassigned
              </Typography>
            </Box>
          )}
          {showApproval && (
            <>
              <Typography sx={{ fontSize: 11, lineHeight: 1, color: 'text.disabled' }}>·</Typography>
              <Box sx={{ display: 'inline-flex' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <ApprovalToggle
                  documentId={doc.id}
                  approvalStatus={doc.approvalStatus}
                  organizationId={organizationId}
                  projectId={projectId}
                  memberRole={memberRole}
                  size="sm"
                />
              </Box>
            </>
          )}
        </Box>

        {/* Row 3: description / notes */}
        {doc.description && (
          <Typography
            sx={{
              fontSize: 11,
              lineHeight: 1.4,
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.description}
          </Typography>
        )}
      </Box>

      {/* Hover actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
      >
        <Box
          component="a"
          href={doc.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '6px',
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <DownloadSimple size={14} />
        </Box>
        <Box
          component="button"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteOpen(true); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '6px',
            border: 'none',
            bgcolor: 'transparent',
            cursor: 'pointer',
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'docExplorer.destructiveMain' },
          }}
        >
          <Trash size={14} />
        </Box>
      </Box>

      <DeleteDocumentDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        documentId={doc.id}
        documentName={doc.name}
        organizationId={organizationId}
      />
    </Box>
  );
}
