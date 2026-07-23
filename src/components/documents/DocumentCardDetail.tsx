'use client';

import { useState } from 'react';
import { Box, Typography, Tooltip, useTheme, alpha } from '@mui/material';
import {
  DownloadSimple,
  Trash,
  FileText,
  FileXls,
  FileImage,
  CheckSquare,
  CircleDashed,
  Folder,
  Calendar,
  HardDrive,
  User,
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

interface DocumentCardDetailProps {
  doc: DocumentResult;
  organizationId: string;
  onPreview: () => void;
}

function getDetailFileIcon(mimeType: string, color: string) {
  if (mimeType.startsWith('image/')) return <FileImage size={22} color={color} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv')
    return <FileXls size={22} color={color} />;
  return <FileText size={22} color={color} />;
}

/**
 * Option D: "Stacked Metadata" — Detail-Rich
 * No preview. Pure metadata card with label:value pairs stacked vertically.
 * Everything visible, no hidden info. Explicit action buttons.
 */
export default function DocumentCardDetail({ doc, organizationId, onPreview }: DocumentCardDetailProps) {
  const theme = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isUnassigned = !doc.taskId;
  const categoryLabel = getCategoryLabel(doc.folderId);
  const { memberRole } = useOrgContext();
  const { projectId } = useProjectContext();
  const showApproval = isApprovableFolder(doc.folderId);

  const metaRows = [
    { icon: <Folder size={12} color={theme.palette.text.disabled} />, label: 'Category', value: categoryLabel },
    { icon: <Calendar size={12} color={theme.palette.text.disabled} />, label: 'Uploaded', value: format(new Date(doc.createdAt), 'MMM d, yyyy') },
    { icon: <HardDrive size={12} color={theme.palette.text.disabled} />, label: 'Size', value: formatFileSize(doc.size) },
    { icon: <User size={12} color={theme.palette.text.disabled} />, label: 'By', value: doc.uploadedBy.name ?? doc.uploadedBy.email },
  ];

  return (
    <Box
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
        flexDirection: 'column',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: isUnassigned ? `3px solid ${theme.palette.warning.main}` : undefined,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.18s ease, box-shadow 0.18s ease',
        willChange: 'transform',
        boxShadow: 'var(--shadow-card)',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          borderLeftColor: isUnassigned ? theme.palette.warning.main : undefined,
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-card-hover)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      {/* Header — thumbnail + filename */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: '16px',
          pt: '16px',
          pb: '12px',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '8px',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <DocumentThumbnail
            url={doc.blobUrl}
            mimeType={doc.mimeType}
            name={doc.name}
            renderWidth={140}
            fallback={getDetailFileIcon(doc.mimeType, theme.palette.text.secondary)}
          />
        </Box>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
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
      </Box>

      {/* Divider */}
      <Box sx={{ height: '1px', bgcolor: 'divider', mx: '16px' }} />

      {/* Metadata rows */}
      <Box sx={{ px: '16px', py: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {metaRows.map((row) => (
          <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {row.icon}
            <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary', width: 60, flexShrink: 0 }}>
              {row.label}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.primary' }}>
              {row.value}
            </Typography>
          </Box>
        ))}

        {/* Task row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {doc.taskId ? (
            <CheckSquare size={12} color={theme.palette.docExplorer.linkedGreen} />
          ) : (
            <CircleDashed size={12} color={theme.palette.warning.main} />
          )}
          <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary', width: 60, flexShrink: 0 }}>
            Task
          </Typography>
          {doc.taskId ? (
            <Tooltip title={doc.task?.name ?? 'Linked to a task'} placement="top" arrow>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: 'docExplorer.linkedGreen',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {doc.task?.name ?? 'Linked'}
              </Typography>
            </Tooltip>
          ) : (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: '6px',
                py: '2px',
                borderRadius: '4px',
                border: '1px dashed',
                borderColor: alpha(theme.palette.warning.main, 0.4),
                bgcolor: alpha(theme.palette.warning.main, 0.08),
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1, color: theme.palette.warning.dark }}>
                Unassigned
              </Typography>
            </Box>
          )}
        </Box>

        {/* Approval row (submittals + inspections only) */}
        {showApproval && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary', width: 60, flexShrink: 0 }}>
              Status
            </Typography>
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
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Box sx={{ height: '1px', bgcolor: 'divider' }} />

      {/* Action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: '16px', py: '10px' }}>
        <Box
          component="a"
          href={doc.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            px: '10px',
            py: '5px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'transparent',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.12s',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <DownloadSimple size={12} color={theme.palette.text.secondary} />
          <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary' }}>
            Download
          </Typography>
        </Box>
        <Box
          component="button"
          onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteOpen(true); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            px: '10px',
            py: '5px',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.12s, color 0.12s',
            '&:hover': { bgcolor: 'docExplorer.destructiveLight', borderColor: 'docExplorer.destructiveMain' },
          }}
        >
          <Trash size={12} color={theme.palette.text.secondary} />
          <Typography sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1, color: 'text.secondary' }}>
            Delete
          </Typography>
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
