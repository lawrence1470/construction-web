'use client';

import { useEffect } from 'react';
import { Dialog, Box, Typography, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ImageSquare,
  FileText,
  ArrowSquareOut,
  DownloadSimple,
  CaretLeft,
  CaretRight,
  X,
} from '@phosphor-icons/react';
import { formatFileSize } from '@/lib/utils/formatting';
import ApprovalToggleSwitch from './ApprovalToggleSwitch';
import type { PreviewDoc } from './types';

interface DocumentPreviewDialogProps {
  open: boolean;
  /** Current doc to display. The parent overlays live approval state onto it. */
  doc: PreviewDoc | null;
  /** 0-based position of `doc` within the navigation set. */
  index: number;
  /** Size of the navigation set. `total <= 1` hides the prev/next controls. */
  total: number;
  /** Step the navigation by `delta` (-1 prev, +1 next). Parent clamps bounds. */
  onStep: (delta: number) => void;
  onClose: () => void;
  /** Show the in-header approve toggle (trackable submittal/inspection docs). */
  approvable?: boolean;
  organizationId?: string;
  memberRole?: string;
}

export default function DocumentPreviewDialog({
  open,
  doc,
  index,
  total,
  onStep,
  onClose,
  approvable = false,
  organizationId,
  memberRole,
}: DocumentPreviewDialogProps) {
  const isImage = doc?.mimeType.startsWith('image/') ?? false;
  const isPdf = doc?.mimeType === 'application/pdf';

  const hasNav = total > 1;
  const canPrev = hasNav && index > 0;
  const canNext = hasNav && index < total - 1;

  // ←/→ step through the navigation set while the dialog is open. Ignored when a
  // text input is focused so typing elsewhere is unaffected.
  useEffect(() => {
    if (!open || !hasNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === 'ArrowRight' && index < total - 1) {
        e.preventDefault();
        onStep(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hasNav, index, total, onStep]);

  const dateLabel = doc
    ? new Date(doc.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const typeLabel = doc
    ? (doc.mimeType.split('/')[1]?.toUpperCase() ?? doc.mimeType)
    : '';

  return (
    <Dialog
      open={open && !!doc}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '88vh',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      {doc && (
        <>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.25,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            {/* Left — prev/next + counter (only when there's a set to step through) */}
            {hasNav && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <NavButton label="Previous (←)" disabled={!canPrev} onClick={() => onStep(-1)}>
                  <CaretLeft size={15} weight="bold" />
                </NavButton>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'text.secondary',
                    minWidth: 44,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    userSelect: 'none',
                  }}
                >
                  {index + 1} / {total}
                </Typography>
                <NavButton label="Next (→)" disabled={!canNext} onClick={() => onStep(1)}>
                  <CaretRight size={15} weight="bold" />
                </NavButton>
              </Box>
            )}

            {/* Center — file icon + name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              {isImage ? (
                <ImageSquare size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              ) : (
                <FileText size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              )}
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                {doc.name}
              </Typography>
            </Box>

            {/* Right — approve toggle (trackable) + open-in-tab + close */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {approvable && organizationId && memberRole && (
                <Box sx={{ mr: 0.5 }}>
                  <ApprovalToggleSwitch
                    documentId={doc.id}
                    documentName={doc.name}
                    approvalStatus={doc.approvalStatus}
                    approvedBy={doc.approvedBy}
                    organizationId={organizationId}
                    memberRole={memberRole}
                    size="md"
                  />
                </Box>
              )}
              {[
                {
                  icon: ArrowSquareOut,
                  label: 'Open in new tab',
                  onClick: () => window.open(doc.blobUrl, '_blank', 'noopener,noreferrer'),
                },
                { icon: X, label: 'Close', onClick: onClose },
              ].map(({ icon: Icon, label, onClick }) => (
                <Box
                  key={label}
                  component="button"
                  onClick={onClick}
                  aria-label={label}
                  sx={{
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    border: 'none',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                    transition: 'background-color 0.15s, color 0.15s',
                  }}
                >
                  <Icon size={15} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Preview area */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              bgcolor: 'background.default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Edge step affordances over the document */}
            {hasNav && (
              <>
                <EdgeNav side="left" label="Previous (←)" disabled={!canPrev} onClick={() => onStep(-1)} />
                <EdgeNav side="right" label="Next (→)" disabled={!canNext} onClick={() => onStep(1)} />
              </>
            )}

            {isImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={doc.blobUrl}
                alt={doc.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : isPdf ? (
              <Box
                component="iframe"
                src={doc.blobUrl}
                title={doc.name}
                sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1.5,
                  color: 'text.secondary',
                }}
              >
                <FileText size={56} color="var(--text-secondary)" />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Preview isn&rsquo;t available for this file type.
                </Typography>
                <Box
                  component="button"
                  onClick={() => window.open(doc.blobUrl, '_blank', 'noopener,noreferrer')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    color: 'text.primary',
                    fontSize: 12,
                    fontWeight: 600,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <DownloadSimple size={14} weight="bold" />
                  Open in new tab
                </Box>
              </Box>
            )}
          </Box>

          {/* Metadata footer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px 12px',
              px: 2,
              py: 1.25,
              borderTop: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          >
            {doc.uploadedBy?.name && (
              <MetaItem label="Uploaded by" value={doc.uploadedBy.name} />
            )}
            <MetaItem label="Date" value={dateLabel} />
            <MetaItem label="Size" value={formatFileSize(doc.size)} />
            <MetaItem label="Type" value={typeLabel} />
          </Box>
        </>
      )}
    </Dialog>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={disabled ? '' : label} arrow disableInteractive>
      <Box
        component="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        sx={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: disabled ? 'default' : 'pointer',
          color: disabled ? 'text.disabled' : 'text.primary',
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled ? {} : { bgcolor: 'action.hover', borderColor: 'text.secondary' },
          transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

// Large, low-emphasis step targets layered over the document edges. Hidden when
// the step would go out of bounds so the ends feel like ends.
function EdgeNav({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  if (disabled) return null;
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={label}
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
        px: 1,
        border: 'none',
        cursor: 'pointer',
        zIndex: 1,
        color: 'text.secondary',
        background: (theme) =>
          side === 'left'
            ? `linear-gradient(90deg, ${alpha(theme.palette.text.primary, 0.06)}, transparent)`
            : `linear-gradient(270deg, ${alpha(theme.palette.text.primary, 0.06)}, transparent)`,
        opacity: 0,
        transition: 'opacity 0.15s',
        '&:hover': { opacity: 1 },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: 'background.paper',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.primary',
        }}
      >
        {side === 'left' ? <CaretLeft size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
      </Box>
    </Box>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
      <Typography
        sx={{
          fontSize: '0.5625rem',
          fontWeight: 600,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}
