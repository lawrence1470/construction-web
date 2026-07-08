'use client';

import { Box, Typography, useTheme, alpha } from '@mui/material';
import { CalendarBlank, User as UserIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { formatFileSize } from '@/lib/utils/formatting';
import { getFileIcon } from '@/lib/utils/files';
import CategoryBadge from '@/components/documents/CategoryBadge';
import ApprovalToggle from './ApprovalToggle';

interface ApproverSummary {
  id: string;
  name: string | null;
  email: string;
}

export interface ReviewDocument {
  id: string;
  name: string;
  blobUrl: string;
  mimeType: string;
  size: number;
  folderId: string;
  createdAt: Date | string;
  approvalStatus: string;
  approvedAt: Date | string | null;
  uploadedBy: ApproverSummary;
  approvedBy: ApproverSummary | null;
}

interface ReviewCardProps {
  doc: ReviewDocument;
  organizationId: string;
  projectId: string;
  memberRole: string;
}

export default function ReviewCard({ doc, organizationId, projectId, memberRole }: ReviewCardProps) {
  const theme = useTheme();
  const uploaderLabel = doc.uploadedBy.name ?? doc.uploadedBy.email;
  const approvedLabel = doc.approvedBy?.name ?? doc.approvedBy?.email ?? null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s ease',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.text.primary, 0.16),
          boxShadow: 'var(--shadow-card-hover)',
          transform: 'translateY(-1px)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      {/* File icon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '8px',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getFileIcon(doc.mimeType)}
      </Box>

      {/* Name + meta */}
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Box
          component="a"
          href={doc.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            '&:hover': { color: 'primary.main' },
          }}
        >
          {doc.name}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <CategoryBadge folderId={doc.folderId} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserIcon size={11} style={{ color: theme.palette.text.secondary }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.2 }}>
              {uploaderLabel}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CalendarBlank size={11} style={{ color: theme.palette.text.secondary }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.2 }}>
              {format(new Date(doc.createdAt), 'MMM d, yyyy')}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.2 }}>
            {formatFileSize(doc.size)}
          </Typography>
          {doc.approvalStatus === 'approved' && approvedLabel && (
            <Typography sx={{ fontSize: 11, color: 'success.main', lineHeight: 1.2 }}>
              {`Approved by ${approvedLabel}${doc.approvedAt ? ` on ${format(new Date(doc.approvedAt), 'MMM d')}` : ''}`}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Toggle */}
      <ApprovalToggle
        documentId={doc.id}
        approvalStatus={doc.approvalStatus}
        organizationId={organizationId}
        projectId={projectId}
        memberRole={memberRole}
      />
    </Box>
  );
}
