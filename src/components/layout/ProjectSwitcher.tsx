'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CaretDown, MagnifyingGlass, Check, Plus, MapPin, ArrowRight, Copy } from '@phosphor-icons/react';
import { Box, Typography, Menu, ButtonBase, alpha, useTheme, type Theme } from '@mui/material';
import ProjectAvatar from '@/components/ui/ProjectAvatar';
import { useOrgFromUrl } from '@/hooks/useOrgFromUrl';
import { useProjectSwitcher } from '@/hooks/useProjectSwitcher';
import AddProjectDialog from '@/components/projects/AddProjectDialog';
import LocationWeather from '@/components/layout/LocationWeather';
import { useSnackbar } from '@/hooks/useSnackbar';

const STATUS_HEX: Record<string, (t: Theme) => string> = {
  active: (t) => t.palette.status.active,
  in_progress: (t) => t.palette.status.inProgress,
  on_hold: (t) => t.palette.status.onHold,
  completed: (t) => t.palette.status.completed,
  archived: (t) => t.palette.status.archived,
};

function getStatusHex(theme: Theme, status: string | null | undefined): string {
  return (status && STATUS_HEX[status]?.(theme)) ?? theme.palette.status.onHold;
}

const RING_RADIUS = 13;
const RING_SIZE = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PANEL_WIDTH = 580;
const LIST_WIDTH = 240;

type SwitcherProject = ReturnType<typeof useProjectSwitcher>['projects'][number];

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Compact label for the header pill. Google Places address descriptions are street-first
 *  ("street, city, state[, country]"), so the city is the second segment; shorter strings
 *  ("City, State" or a plain label) read best by their first segment. Full address stays
 *  available via the title tooltip. */
function cityFromLocation(location: string): string {
  const parts = location.split(',').map((p) => p.trim());
  return parts.length >= 3 ? parts[1]! : parts[0]!;
}

function MemberAvatar({ name, image, size = 22 }: { name: string | null; image: string | null; size?: number }) {
  if (image) {
    return (
      <Box
        component="img"
        src={image}
        alt=""
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid',
          borderColor: 'background.paper',
          display: 'block',
        }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: 'secondary.main',
        color: 'text.secondary',
        display: 'grid',
        placeItems: 'center',
        fontSize: '9px',
        fontWeight: 600,
        border: '1.5px solid',
        borderColor: 'background.paper',
        letterSpacing: 0,
      }}
    >
      {getInitials(name)}
    </Box>
  );
}

interface PreviewPaneProps {
  project: SwitcherProject;
  isCurrent: boolean;
  organizationId: string;
  onSwitch: (slug: string) => void;
}

function PreviewPane({ project, isCurrent, organizationId, onSwitch }: PreviewPaneProps) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);
  const overflow = Math.max(0, project.memberCount - 4);

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.location) return;
    try {
      await navigator.clipboard.writeText(project.location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showSnackbar('Could not copy address', 'error');
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        p: 1.75,
        gap: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      {/* Header: cover + name + location */}
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ flexShrink: 0 }}>
          <ProjectAvatar
            imageUrl={project.imageUrl}
            icon={project.icon}
            colorId={project.imageUrl ? null : (project.color ?? 'slate')}
            size={48}
            borderRadius="10px"
          />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.005em',
              color: 'text.primary',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </Typography>
          {project.location ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '3px', minWidth: 0, maxWidth: '100%' }}>
              <MapPin size={10} weight="bold" style={{ flexShrink: 0, opacity: 0.55 }} />
              <Typography
                sx={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: 'text.secondary',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {project.location}
              </Typography>
              <ButtonBase
                onClick={handleCopyAddress}
                aria-label={copied ? 'Address copied' : 'Copy address'}
                title={copied ? 'Copied!' : 'Copy address'}
                sx={{
                  flexShrink: 0,
                  width: 18,
                  height: 18,
                  borderRadius: '4px',
                  color: 'text.secondary',
                  transition: 'background-color 0.12s, color 0.12s',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                }}
              >
                {copied ? (
                  <Check size={11} weight="bold" style={{ color: theme.palette.success.main }} />
                ) : (
                  <Copy size={11} weight="bold" />
                )}
              </ButtonBase>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '11.5px', color: 'text.disabled', mt: '3px' }}>
              No location set
            </Typography>
          )}
        </Box>
      </Box>

      {/* Weather + local time — derived from project location */}
      {project.location && organizationId && (
        <LocationWeather location={project.location} organizationId={organizationId} />
      )}

      {/* Stat row — borderless, left-aligned, whitespace-separated */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
        <ProgressCell
          percent={project.completionPercent}
          status={project.status}
          label="Complete"
        />
        <StatCell label="Tasks" value={project.taskCount.toLocaleString()} />
        <StatCell
          label="Pending"
          value={project.pendingApprovalsCount.toLocaleString()}
          accent={project.pendingApprovalsCount > 0 ? theme.palette.warning.main : undefined}
        />
      </Box>

      {/* Team */}
      <Box>
        <Typography
          sx={{
            fontSize: '9px',
            fontWeight: 600,
            color: 'text.secondary',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            mb: 0.75,
          }}
        >
          Team
        </Typography>
        {project.members.length > 0 ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {project.members.slice(0, 4).map((m, i) => (
              <Box key={m.id} sx={{ ml: i === 0 ? 0 : '-6px' }}>
                <MemberAvatar name={m.name} image={m.image} />
              </Box>
            ))}
            {overflow > 0 && (
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: 'secondary.main',
                  color: 'text.secondary',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '9px',
                  fontWeight: 600,
                  border: '1.5px solid',
                  borderColor: 'background.paper',
                  ml: '-6px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                +{overflow}
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '11.5px', color: 'text.disabled' }}>No members yet</Typography>
        )}
      </Box>

      {/* Spacer pushes button down */}
      <Box sx={{ flex: 1 }} />

      {/* Switch CTA */}
      <ButtonBase
        onClick={() => onSwitch(project.slug)}
        disabled={isCurrent}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          width: '100%',
          py: 1,
          px: 1.5,
          borderRadius: '8px',
          bgcolor: isCurrent ? 'action.disabledBackground' : 'primary.main',
          color: isCurrent ? 'text.disabled' : 'primary.contrastText',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '-0.005em',
          transition: 'background-color 0.12s, opacity 0.12s',
          cursor: isCurrent ? 'default' : 'pointer',
          '&:hover': {
            bgcolor: isCurrent ? 'action.disabledBackground' : alpha(theme.palette.primary.main, 0.88),
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        {isCurrent ? (
          <>
            <Check size={13} weight="bold" />
            <span>Current project</span>
          </>
        ) : (
          <>
            <span>Switch to {project.name}</span>
            <ArrowRight size={13} weight="bold" />
          </>
        )}
      </ButtonBase>
    </Box>
  );
}

const STAT_CELL_SX = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 0.5,
} as const;

const STAT_VALUE_SX = {
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '-0.015em',
  color: 'text.primary',
  fontVariantNumeric: 'tabular-nums',
} as const;

const STAT_LABEL_SX = {
  fontSize: '9.5px',
  fontWeight: 600,
  color: 'text.secondary',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  lineHeight: 1,
} as const;

function StatCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Box sx={STAT_CELL_SX}>
      <Typography sx={{ ...STAT_VALUE_SX, color: accent ?? 'text.primary' }}>{value}</Typography>
      <Typography sx={STAT_LABEL_SX}>{label}</Typography>
    </Box>
  );
}

const PROGRESS_RING_SIZE = 18;
const PROGRESS_RING_RADIUS = 7.5;
const PROGRESS_RING_CIRC = 2 * Math.PI * PROGRESS_RING_RADIUS;

function ProgressCell({
  percent,
  status,
  label,
}: {
  percent: number;
  status: string | null;
  label: string;
}) {
  const theme = useTheme();
  const pct = Math.min(Math.max(percent, 0), 100);
  const dash = (PROGRESS_RING_CIRC * pct) / 100;
  const color = getStatusHex(theme, status);

  return (
    <Box sx={STAT_CELL_SX}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <svg
          width={PROGRESS_RING_SIZE}
          height={PROGRESS_RING_SIZE}
          viewBox={`0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}`}
          style={{ transform: 'rotate(-90deg)', display: 'block', flexShrink: 0 }}
        >
          <circle
            cx={PROGRESS_RING_SIZE / 2}
            cy={PROGRESS_RING_SIZE / 2}
            r={PROGRESS_RING_RADIUS}
            fill="none"
            stroke={alpha(theme.palette.text.primary, 0.12)}
            strokeWidth={2}
          />
          {pct > 0 && (
            <circle
              cx={PROGRESS_RING_SIZE / 2}
              cy={PROGRESS_RING_SIZE / 2}
              r={PROGRESS_RING_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${PROGRESS_RING_CIRC}`}
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          )}
        </svg>
        <Typography sx={STAT_VALUE_SX}>{pct}%</Typography>
      </Box>
      <Typography sx={STAT_LABEL_SX}>{label}</Typography>
    </Box>
  );
}

export default function ProjectSwitcher() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const params = useParams<{ projectSlug?: string }>();
  const { projectSlug } = params;
  const theme = useTheme();

  const { orgSlug, activeOrganizationId } = useOrgFromUrl();
  const { projects, effectiveProject, switchProject } = useProjectSwitcher(activeOrganizationId, orgSlug);

  const open = Boolean(anchorEl);

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  // Default preview to the currently-active project (or first in the filtered list).
  useEffect(() => {
    if (!open) return;
    if (previewId && filtered.some((p) => p.id === previewId)) return;
    const fallback = effectiveProject ?? filtered[0] ?? null;
    setPreviewId(fallback?.id ?? null);
  }, [open, filtered, effectiveProject, previewId]);

  const previewProject = filtered.find((p) => p.id === previewId) ?? null;

  const handleSwitch = (slug: string) => {
    switchProject(slug);
    setAnchorEl(null);
    setSearch('');
    setPreviewId(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch('');
    setPreviewId(null);
  };

  const displayedProject = effectiveProject;
  const hasProject = !!displayedProject;

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          pl: 0.625,
          pr: 1.125,
          py: 0.625,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '999px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
          color: 'text.primary',
          fontSize: '14.5px',
          fontWeight: 600,
          letterSpacing: '-0.005em',
          lineHeight: 1,
          minWidth: 0,
          maxWidth: 320,
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: (theme) => theme.palette.mode === 'dark' ? alpha(theme.palette.divider, 0.8) : '#d4d4d4',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: RING_SIZE,
            height: RING_SIZE,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'rotate(-90deg)',
              pointerEvents: 'none',
            }}
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={alpha(theme.palette.text.primary, 0.10)}
              strokeWidth={2}
            />
            {hasProject && displayedProject.completionPercent > 0 && (
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={getStatusHex(theme, displayedProject.status)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={`${(RING_CIRCUMFERENCE * Math.min(displayedProject.completionPercent, 100)) / 100} ${RING_CIRCUMFERENCE}`}
              />
            )}
          </svg>
          <ProjectAvatar
            imageUrl={displayedProject?.imageUrl}
            icon={displayedProject?.icon}
            colorId={displayedProject?.imageUrl ? null : displayedProject?.color}
            size={22}
            borderRadius="50%"
            color="var(--text-secondary)"
          />
          {hasProject && displayedProject.completionPercent > 0 && (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                top: -3,
                right: -7,
                minWidth: 18,
                height: 14,
                px: '4px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                fontVariantNumeric: 'tabular-nums',
                border: '1.5px solid',
                borderColor: 'background.paper',
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              {displayedProject.completionPercent}
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '1px',
            minWidth: 0,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: '13.5px',
              fontWeight: 600,
              letterSpacing: '-0.005em',
              color: hasProject ? 'text.primary' : 'text.secondary',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 240,
            }}
          >
            {hasProject ? displayedProject.name : 'Select project'}
          </Typography>
          {hasProject && displayedProject.location && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                maxWidth: 240,
                minWidth: 0,
              }}
            >
              <MapPin size={10} weight="bold" style={{ flexShrink: 0, opacity: 0.55 }} />
              <Typography
                component="span"
                title={displayedProject.location}
                sx={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'text.secondary',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cityFromLocation(displayedProject.location)}
              </Typography>
            </Box>
          )}
        </Box>
        <CaretDown size={13} style={{ flexShrink: 0, color: 'var(--text-secondary)' }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: PANEL_WIDTH,
              p: 0,
              overflow: 'hidden',
              mt: 0.5,
              borderRadius: '12px',
            },
          },
          list: {
            sx: { p: 0 },
          },
        }}
      >
        <Box sx={{ display: 'flex', minHeight: 360 }}>
          {/* Left column: search + tight name list */}
          <Box
            sx={{
              width: LIST_WIDTH,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            {/* Search */}
            <Box sx={{ p: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.875,
                  bgcolor: 'secondary.main',
                  borderRadius: '8px',
                  color: 'text.secondary',
                }}
              >
                <MagnifyingGlass size={13} style={{ color: 'inherit', flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'inherit',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
              </Box>
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 0.75, pb: 0.5, display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {filtered.map((project) => {
                const isActive = project.slug === (projectSlug ?? displayedProject?.slug);
                const isPreviewed = project.id === previewId;
                return (
                  <Box
                    key={project.id}
                    component="button"
                    onClick={() => setPreviewId(project.id)}
                    onFocus={() => setPreviewId(project.id)}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%',
                      pl: 1.25,
                      pr: 1,
                      py: 0.875,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      bgcolor: isPreviewed ? 'action.selected' : 'transparent',
                      textAlign: 'left',
                      transition: 'background-color 0.1s ease',
                      '&::before': isPreviewed
                        ? {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 7,
                            bottom: 7,
                            width: '2.5px',
                            borderRadius: '0 2px 2px 0',
                            bgcolor: 'primary.main',
                          }
                        : {},
                      '&:hover': {
                        bgcolor: isPreviewed ? 'action.selected' : 'action.hover',
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: getStatusHex(theme, project.status),
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        flex: 1,
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: 'text.primary',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {project.name}
                    </Typography>
                    {isActive && (
                      <Check
                        size={12}
                        weight="bold"
                        style={{ flexShrink: 0, color: theme.palette.primary.main }}
                      />
                    )}
                  </Box>
                );
              })}
              {filtered.length === 0 && (
                <Typography sx={{ px: 1.25, py: 1.5, fontSize: '12.5px', color: 'text.secondary' }}>
                  No projects found
                </Typography>
              )}
            </Box>

            {/* Create new */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
              <Box
                component="button"
                onClick={() => {
                  setAnchorEl(null);
                  setCreateDialogOpen(true);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 1.125,
                  width: '100%',
                  border: 'none',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Plus size={13} weight="bold" />
                <Typography sx={{ fontSize: '12.5px', fontWeight: 500, color: 'text.secondary' }}>
                  Create new project
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Right column: preview pane */}
          {previewProject ? (
            <PreviewPane
              project={previewProject}
              isCurrent={previewProject.slug === (projectSlug ?? displayedProject?.slug)}
              organizationId={activeOrganizationId}
              onSwitch={handleSwitch}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'grid',
                placeItems: 'center',
                p: 3,
                textAlign: 'center',
                color: 'text.secondary',
                bgcolor: 'background.paper',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 500, color: 'text.primary', mb: 0.5 }}>
                  {projects.length === 0 ? 'No projects yet' : 'Select a project'}
                </Typography>
                <Typography sx={{ fontSize: '12px' }}>
                  {projects.length === 0
                    ? 'Create your first project to get started.'
                    : 'Hover a project on the left to preview.'}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Menu>

      <AddProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
