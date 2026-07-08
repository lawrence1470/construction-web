'use client';

import { useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { Download, Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import { isApprovableFolder } from '@/lib/folders';
import { useOrgContext } from '@/components/providers/OrgProvider';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import ApprovalToggle from '@/components/approvals/ApprovalToggle';
import DeleteDocumentDialog from './DeleteDocumentDialog';
import type { DocumentResult } from './types';

interface DocumentCardGalleryProps {
  doc: DocumentResult;
  organizationId: string;
}

export default function DocumentCardGallery({ doc, organizationId }: DocumentCardGalleryProps) {
  const theme = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isImage = doc.mimeType.startsWith('image/');
  const isUnassigned = !doc.taskId;
  const { memberRole } = useOrgContext();
  const { projectId } = useProjectContext();
  const showApproval = isApprovableFolder(doc.folderId);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: isUnassigned
          ? alpha(theme.palette.warning.main, 0.5)
          : hovered
            ? alpha(theme.palette.primary.main, 0.3)
            : 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.18s ease, box-shadow 0.18s ease',
        cursor: 'pointer',
        willChange: 'transform',
        boxShadow: 'var(--shadow-card)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 'var(--shadow-card-hover)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      {/* Preview area */}
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isImage ? (
          <Box
            component="img"
            src={doc.blobUrl}
            alt={doc.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          doc.mimeType.includes('spreadsheet') || doc.mimeType.includes('excel') || doc.mimeType === 'text/csv'
            ? <FileSpreadsheet size={32} style={{ color: theme.palette.text.disabled }} />
            : <FileText size={32} style={{ color: theme.palette.text.disabled }} />
        )}
      </Box>

      {/* Persistent caption bar */}
      <Box
        sx={{
          height: 28,
          px: '8px',
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {doc.name}
        </Typography>
      </Box>

      {/* Persistent unassigned indicator (top-left) — mutually exclusive with approval pill (unassigned has no folder) */}
      {isUnassigned && (
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            px: '6px',
            py: '2px',
            borderRadius: '4px',
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(4px)',
            color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.dark,
            border: `1px dashed ${alpha(theme.palette.warning.main, 0.5)}`,
            zIndex: 1,
          }}
        >
          <Typography sx={{ fontSize: 9, fontWeight: 700, lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Unassigned
          </Typography>
        </Box>
      )}

      {/* Persistent approval pill on the thumbnail (submittals + inspections only) */}
      {showApproval && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <ApprovalToggle
            documentId={doc.id}
            approvalStatus={doc.approvalStatus}
            organizationId={organizationId}
            projectId={projectId}
            memberRole={memberRole}
            size="sm"
          />
        </Box>
      )}

      {/* Hover overlay with actions */}
      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 40%)',
            borderRadius: '9px',
          }}
        >
          {/* Top actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', p: '8px' }}>
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
                bgcolor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
            >
              <Download size={14} />
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
                bgcolor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.6)' },
              }}
            >
              <Trash2 size={14} />
            </Box>
          </Box>
        </Box>
      )}

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
