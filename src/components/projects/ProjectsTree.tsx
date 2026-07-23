'use client';

import { useState, useCallback, Fragment, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderSimple,
  FolderOpen,
  FileText,
  Plus,
  CalendarBlank,
  ArrowsInSimple,
  ArrowsOutSimple,
  MagnifyingGlass,
  X,
  UploadSimple,
  Question,
  PaperPlaneTilt,
  PencilSimpleLine,
  Camera,
  ClipboardText,
  Hammer,
  ChartBar,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, IconButton, InputBase, Skeleton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keepPreviousData } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import UploadDialog from '@/components/documents/UploadDialog';
import { useDocumentUploader } from '@/components/documents/useDocumentUploader';
import { folderData } from '@/lib/folders';
import { getProjectNavHref } from '@/components/layout/navItems';
import { useGanttFocusStore } from '@/store/ganttFocusStore';

export { folderData };

const folderIconMap: Record<string, PhosphorIcon> = {
  rfi: Question,
  submittals: PaperPlaneTilt,
  'change-orders': PencilSimpleLine,
  photos: Camera,
  inspections: ClipboardText,
};

export interface Selection {
  type: 'task' | 'folder' | 'document';
  nodeId: string;
  taskId: string;
  folderName?: string;
  parentFolderName?: string;
  folderId?: string;
  documentId?: string;
  documentName?: string;
  blobUrl?: string;
  mimeType?: string;
}

interface ProjectsTreeProps {
  selectedNodeId: string | null;
  onSelect: (selection: Selection | null) => void;
  projectId?: string;
  organizationId?: string;
}

// Component to display folder with document count badge
interface FolderNodeProps {
  folder: typeof folderData[0];
  taskId: string;
  projectId: string | null;
  organizationId: string | undefined;
  expandedItems: string[];
}

function FolderNode({ folder, taskId, projectId, organizationId, expandedItems }: FolderNodeProps) {
  const theme = useTheme();
  const folderId = `${taskId}-${folder.id}`;
  const isExpanded = expandedItems.includes(folderId);
  const utils = api.useUtils();
  const [uploadOpen, setUploadOpen] = useState(false);

  // Get document counts for this task
  const { data: counts } = api.document.countByTask.useQuery(
    {
      organizationId: organizationId!,
      projectId: projectId!,
      taskId: taskId.replace('task-', ''),
    },
    {
      enabled: !!organizationId && !!projectId,
    }
  );

  // Get all documents for this task (shared across FolderNodes via React Query cache)
  const { data: allDocs } = api.document.listByTask.useQuery(
    {
      organizationId: organizationId!,
      projectId: projectId!,
      taskId: taskId.replace('task-', ''),
    },
    {
      enabled: !!organizationId && !!projectId,
    }
  );

  // Filter docs for this specific folder
  const folderDocs = useMemo(
    () => (allDocs ?? []).filter((d) => d.folderId === folder.id),
    [allDocs, folder.id]
  );

  const documentCount = counts?.[folder.id]?.total ?? 0;
  const childDocCount = folder.children?.reduce(
    (acc, child) => acc + (counts?.[child.id]?.total ?? 0), 0
  ) ?? 0;
  // Empty when no documents in this folder or any of its children
  const isEmpty = documentCount === 0 && childDocCount === 0;

  const handleUploadComplete = () => {
    if (organizationId && projectId) {
      void utils.document.countByTask.invalidate({
        organizationId,
        projectId,
        taskId: taskId.replace('task-', ''),
      });
      void utils.document.listByTask.invalidate({
        organizationId,
        projectId,
        taskId: taskId.replace('task-', ''),
      });
      void utils.document.listByFolder.invalidate();
    }
  };

  return (
    <Fragment>
      <TreeItem
      key={folderId}
      itemId={folderId}
      label={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.375,
            opacity: isEmpty ? 0.55 : 1,
            '&:hover .empty-upload-hint': { opacity: 1 },
          }}
          onClick={isEmpty ? (e: React.MouseEvent) => { e.stopPropagation(); setUploadOpen(true); } : undefined}
        >
          {(() => {
            const FolderIcon = folderIconMap[folder.id] ?? (isExpanded ? FolderOpen : FolderSimple);
            return <FolderIcon size={14} color={isEmpty ? theme.palette.text.disabled : folder.color} />;
          })()}
          <Box
            sx={{
              fontWeight: 500,
              flexGrow: 1,
              fontSize: '0.8125rem',
              color: isEmpty ? 'text.disabled' : undefined,
              fontStyle: isEmpty ? 'italic' : undefined,
            }}
          >
            {folder.name}
          </Box>

          {/* Document count badge — only when non-empty */}
          {documentCount > 0 && (
            <Box
              sx={{
                minWidth: 18,
                height: 18,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
                fontSize: '0.625rem',
                fontWeight: 600,
                lineHeight: 1,
                bgcolor: `${folder.color}18`,
                color: folder.color,
                border: '1px solid',
                borderColor: `${folder.color}30`,
              }}
            >
              {documentCount}
            </Box>
          )}

          {/* Upload button — only on non-empty folders (empty rows are themselves the upload target) */}
          {!isEmpty && (
            <IconButton
              size="small"
              aria-label={`Upload file to ${folder.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setUploadOpen(true);
              }}
              sx={{
                p: 0.5,
                color: 'text.disabled',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <Plus size={14} weight="bold" />
            </IconButton>
          )}

          {/* Upload hint — fades in on hover for empty folders */}
          {isEmpty && (
            <Box
              className="empty-upload-hint"
              sx={{
                opacity: 0,
                transition: 'opacity 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                color: 'text.disabled',
              }}
            >
              <Plus size={10} weight="bold" />
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, lineHeight: 1 }}>
                Upload
              </Typography>
            </Box>
          )}
        </Box>
      }
    >
      {!folder.isLeaf &&
        folder.children &&
        folder.children.filter((child) => (counts?.[child.id]?.total ?? 0) > 0).map((child) => {
          const childId = `${folderId}-${child.id}`;
          const childDocCount = counts?.[child.id]?.total ?? 0;
          const childDocs = (allDocs ?? []).filter((d) => d.folderId === child.id);

          return (
            <TreeItem
              key={childId}
              itemId={childId}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.375 }}>
                  <FileText size={14} style={{ opacity: 0.6 }} />
                  <Box sx={{ flexGrow: 1, fontSize: '0.8125rem' }}>{child.name}</Box>
                  {childDocCount > 0 && (
                    <Box
                      sx={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        lineHeight: 1,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    >
                      {childDocCount}
                    </Box>
                  )}
                  <IconButton
                    size="small"
                    aria-label={`Upload file to ${child.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadOpen(true);
                    }}
                    sx={{
                      p: 0.5,
                      color: 'text.disabled',
                      '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <Plus size={14} weight="bold" />
                  </IconButton>
                </Box>
              }
            >
              {childDocs.map((doc) => (
                <TreeItem
                  key={`${taskId}-doc-${doc.id}`}
                  itemId={`${taskId}-doc-${doc.id}`}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.2 }}>
                      <FileText size={12} color={theme.palette.status.completed} />
                      <Box sx={{
                        flexGrow: 1,
                        fontSize: '0.75rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {doc.name}
                      </Box>
                    </Box>
                  }
                />
              ))}
            </TreeItem>
          );
        })}
      {/* Documents directly in this folder */}
      {folderDocs.map((doc) => (
        <TreeItem
          key={`${taskId}-doc-${doc.id}`}
          itemId={`${taskId}-doc-${doc.id}`}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
              <FileText size={12} style={{ color: theme.palette.status.completed }} />
              <Box sx={{
                flexGrow: 1,
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {doc.name}
              </Box>
            </Box>
          }
        />
      ))}
      </TreeItem>

      {projectId && organizationId && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          projectId={projectId}
          taskId={taskId.replace('task-', '')}
          folderId={folder.id}
          folderName={folder.name}
          onUploadComplete={handleUploadComplete}
        />
      )}
    </Fragment>
  );
}

function deriveStatus(percentDone: number, theme: import('@mui/material/styles').Theme) {
  if (percentDone >= 100) return { name: 'Completed', color: theme.palette.success.main };
  if (percentDone > 0) return { name: 'In Progress', color: theme.palette.status.completed };
  return { name: 'Planned', color: theme.palette.text.disabled };
}

/**
 * Limbo-upload button: posts files to /api/upload without taskId/folderId so they
 * land as "unassigned" and surface in the doc-explorer's Unassigned chip.
 * Rendered only when both ids are available so the hook can run cleanly.
 */
function UnassignedUploader({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload } = useDocumentUploader({ organizationId, projectId });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void upload(files);
    // Reset so re-selecting the same file fires onChange again.
    e.target.value = '';
  };

  return (
    <Fragment>
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        aria-label="Upload unassigned document"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          px: '8px',
          py: '4px',
          borderRadius: '6px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          cursor: 'pointer',
          fontSize: '0.6875rem',
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '0.01em',
          transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            color: 'primary.main',
          },
        }}
      >
        <UploadSimple size={11} weight="bold" />
        Upload
      </Box>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={handleChange}
      />
    </Fragment>
  );
}

export default function ProjectsTree({ selectedNodeId, onSelect, projectId, organizationId }: ProjectsTreeProps) {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams<{ orgSlug?: string; projectSlug?: string }>();
  const requestGanttFocus = useGanttFocusStore((s) => s.requestFocus);

  // Jump to this task on the Gantt/Timeline: hand the id to the Gantt, then navigate.
  const handleViewInTimeline = useCallback(
    (taskId: string) => {
      requestGanttFocus(taskId);
      router.push(getProjectNavHref('gantt', params.orgSlug, params.projectSlug));
    },
    [requestGanttFocus, router, params.orgSlug, params.projectSlug]
  );

  const { data: tasks = [], isLoading } = api.gantt.tasks.useQuery(
    { organizationId: organizationId!, projectId: projectId! },
    { enabled: !!projectId && !!organizationId, placeholderData: keepPreviousData }
  );

  // Build grouped structure from database tasks:
  // Top-level tasks (no parentId) = groups, their children = tasks
  const { groups, grouped } = useMemo(() => {
    const topLevel = tasks.filter((t) => !t.parentId);
    const groupedMap: Record<string, Array<{ id: string; name: string; status: { name: string; color: string }; progress: number }>> = {};

    for (const parent of topLevel) {
      const children = tasks.filter((t) => t.parentId === parent.id);
      groupedMap[parent.id] = children.map((c) => ({
        id: c.id,
        name: c.name,
        status: deriveStatus(c.percentDone, theme),
        progress: Math.round(c.percentDone),
      }));
    }

    return { groups: topLevel.map((t) => ({ id: t.id, name: t.name })), grouped: groupedMap };
  }, [tasks]);

  const activeProjectId = projectId ?? null;
  const activeOrganizationId = organizationId;

  // Controlled expanded state — tasks start collapsed (user expands to see folders)
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const expandAll = useCallback(() => {
    const allIds: string[] = [];
    for (const group of groups) {
      const tasks = grouped[group.id] ?? [];
      if (tasks.length === 0) {
        const groupTaskId = `task-${group.id}`;
        allIds.push(groupTaskId);
        for (const folder of folderData) {
          allIds.push(`${groupTaskId}-${folder.id}`);
        }
      } else {
        for (const task of tasks) {
          const taskId = `task-${task.id}`;
          allIds.push(taskId);
          for (const folder of folderData) {
            allIds.push(`${taskId}-${folder.id}`);
          }
        }
      }
    }
    setExpandedItems(allIds);
  }, [groups, grouped]);

  const collapseAll = useCallback(() => {
    setExpandedItems([]);
  }, []);

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const queryLower = searchQuery.toLowerCase();

  const { filteredGroups, filteredGrouped, searchExpandedIds } = useMemo(() => {
    if (!queryLower) {
      return { filteredGroups: groups, filteredGrouped: grouped, searchExpandedIds: null };
    }

    const fGroups: typeof groups = [];
    const fGrouped: typeof grouped = {};
    const expandIds: string[] = [];

    for (const group of groups) {
      const groupMatches = group.name.toLowerCase().includes(queryLower);
      const tasks = grouped[group.id] ?? [];
      const matchingTasks = tasks.filter((t) => t.name.toLowerCase().includes(queryLower));

      if (groupMatches || matchingTasks.length > 0) {
        fGroups.push(group);
        fGrouped[group.id] = groupMatches ? tasks : matchingTasks;

        // Auto-expand matching tasks (no group-level node to expand)
        const visibleTasks = groupMatches ? tasks : matchingTasks;
        for (const task of visibleTasks) {
          expandIds.push(`task-${task.id}`);
        }
        if (tasks.length === 0) {
          expandIds.push(`task-${group.id}`);
        }
      }
    }

    return { filteredGroups: fGroups, filteredGrouped: fGrouped, searchExpandedIds: expandIds };
  }, [queryLower, groups, grouped]);

  // When searching, override expanded items to show matches
  const effectiveExpandedItems = searchExpandedIds ?? expandedItems;
  const handleExpandedItemsChange = useCallback((_: React.SyntheticEvent | null, items: string[]) => {
    if (!searchQuery) setExpandedItems(items);
  }, [searchQuery]);

  // Handle selection change
  const handleSelectedItemsChange = (_event: React.SyntheticEvent | null, itemIds: string | null) => {
    const nodeId = itemIds;
    if (!nodeId) {
      onSelect(null);
      return;
    }

    // Task items just expand/collapse — no detail panel
    if (nodeId.startsWith('task-') && !nodeId.includes('-', 5)) {
      onSelect(null);
      return;
    }

    // Parse document selection: task-{taskId}-doc-{docId}
    const docMatch = nodeId.match(/^task-(.+)-doc-(.+)$/);
    if (docMatch && docMatch[1] && docMatch[2]) {
      onSelect({
        type: 'document',
        nodeId,
        taskId: docMatch[1],
        documentId: docMatch[2],
      });
      return;
    }

    // Parse folder selection: task-{featureId}-{folderId} or task-{featureId}-{folderId}-{childId}
    const parts = nodeId.split('-');
    if (parts.length >= 3 && parts[0] === 'task' && parts[1] && parts[2]) {
      const taskId = parts[1];
      const folderId = parts[2];

      // Find folder name
      let folderName: string;
      let parentFolderName: string | undefined;
      let actualFolderId: string;

      if (parts.length === 3) {
        // Top-level folder
        const folder = folderData.find((f) => f.id === folderId);
        folderName = folder?.name ?? folderId;
        actualFolderId = folderId;
      } else if (parts.length === 4 && parts[3]) {
        // Sub-folder
        const childId = parts[3];
        const parentFolder = folderData.find((f) => f.id === folderId);
        const childFolder = parentFolder?.children?.find((c) => c.id === childId);
        folderName = childFolder?.name ?? childId;
        parentFolderName = parentFolder?.name;
        actualFolderId = childId;
      } else {
        // Fallback
        folderName = folderId;
        actualFolderId = folderId;
      }

      onSelect({
        type: 'folder',
        nodeId,
        taskId,
        folderName,
        parentFolderName,
        folderId: actualFolderId,
      });
      return;
    }

    onSelect(null);
  };

  const headerBar = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'text.primary',
          letterSpacing: '-0.01em',
        }}
      >
        Tree
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {projectId && organizationId && (
          <UnassignedUploader projectId={projectId} organizationId={organizationId} />
        )}
        <Box
          component="button"
          onClick={expandAll}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'text.secondary',
            opacity: 0.6,
            p: 0,
            fontSize: '0.5625rem',
            fontWeight: 500,
            letterSpacing: '0.05em',
            lineHeight: 1,
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 1 },
          }}
        >
          <ArrowsOutSimple size={10} weight="bold" />
          Expand
        </Box>
        {expandedItems.length > 0 && (
          <Box
            component="button"
            onClick={collapseAll}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'text.secondary',
              opacity: 0.6,
              p: 0,
              fontSize: '0.5625rem',
              fontWeight: 500,
              letterSpacing: '0.05em',
              lineHeight: 1,
              transition: 'opacity 0.15s',
              '&:hover': { opacity: 1 },
            }}
          >
            <ArrowsInSimple size={10} weight="bold" />
            Collapse
          </Box>
        )}
      </Box>
    </Box>
  );

  const searchBar = (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'border-color 0.15s',
          '&:focus-within': { borderColor: 'primary.main' },
        }}
      >
        <MagnifyingGlass size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
        <InputBase
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            fontSize: '0.8125rem',
            '& .MuiInputBase-input': { p: 0 },
          }}
        />
        {searchQuery && (
          <IconButton
            size="small"
            onClick={() => setSearchQuery('')}
            sx={{ p: 0.25, color: 'text.secondary' }}
          >
            <X size={12} weight="bold" />
          </IconButton>
        )}
      </Box>
    </Box>
  );

  // Ghost tree loading state — real folder structure at reduced opacity
  if (isLoading) {
    const ghostGroups = [
      { nameWidth: 140, taskWidth: 160 },
      { nameWidth: 180, taskWidth: 120 },
    ];

    return (
      <Box sx={{ width: '100%' }}>
        {headerBar}
        <Box
          sx={{
            py: 0.5,
            '@keyframes ghostPulse': {
              '0%, 100%': { opacity: 0.3 },
              '50%': { opacity: 0.5 },
            },
            animation: 'ghostPulse 2s ease-in-out infinite',
          }}
        >
          {ghostGroups.map((group, gi) => (
            <Fragment key={gi}>
              {/* Group row — skeleton for dynamic name */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.375,
                  px: 1.5,
                }}
              >
                <FolderSimple size={16} style={{ flexShrink: 0, opacity: 0.4 }} />
                <Skeleton variant="rounded" width={group.nameWidth} height={12} animation={false} sx={{ flexShrink: 0 }} />
                <Box sx={{ flexGrow: 1 }} />
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>0 tasks</Typography>
              </Box>

              {/* Task row — skeleton for dynamic name */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.375,
                  px: 1.5,
                  ml: 2.5,
                }}
              >
                <Hammer size={14} style={{ flexShrink: 0, opacity: 0.4 }} />
                <Skeleton variant="rounded" width={group.taskWidth} height={12} animation={false} sx={{ flexShrink: 0 }} />
                <Box sx={{ flexGrow: 1 }} />
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>Planned</Typography>
              </Box>

              {/* Folder rows — real icons, names, and colors */}
              {folderData.map((folder) => {
                const FolderIcon = folderIconMap[folder.id] ?? FolderSimple;
                return (
                  <Box
                    key={folder.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 0.375,
                      px: 1.5,
                      ml: 5,
                    }}
                  >
                    <FolderIcon size={14} color={folder.color} style={{ flexShrink: 0 }} />
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'text.disabled',
                        flexGrow: 1,
                      }}
                    >
                      {folder.name}
                    </Typography>
                  </Box>
                );
              })}
            </Fragment>
          ))}
        </Box>
      </Box>
    );
  }

  // Empty state when no tasks exist
  if (groups.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {headerBar}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            p: 4,
            textAlign: 'center',
          }}
        >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '12px',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <CalendarBlank size={32} color="var(--text-muted)" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
          No Tasks Yet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 280, mb: 2 }}>
          Add tasks to your Gantt chart to organize project documents
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 300 }}>
          💡 Tasks you create in the Gantt chart will automatically appear here with folders for documents, photos, and submittals
        </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {headerBar}
      {searchBar}
      {searchQuery && filteredGroups.length === 0 ? (
        <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            No tasks matching &ldquo;{searchQuery}&rdquo;
          </Typography>
        </Box>
      ) : (
      <SimpleTreeView
        expandedItems={effectiveExpandedItems}
        onExpandedItemsChange={handleExpandedItemsChange}
        selectedItems={selectedNodeId}
        onSelectedItemsChange={handleSelectedItemsChange}
        sx={{
          '& .MuiTreeItem-content': {
            borderRadius: '8px',
            transition: 'background-color 0.15s ease',
            '&:hover': {
              bgcolor: 'sidebar.hoverBg',
            },
            '&.Mui-selected': {
              bgcolor: 'sidebar.activeItemBg',
              '&:hover': {
                bgcolor: 'sidebar.activeItemBg',
              },
            },
            '&.Mui-focused': {
              bgcolor: 'transparent',
            },
          },
          // Reveal the "View in timeline" action only on row hover/focus.
          '& .view-in-timeline-btn': { opacity: 0, transition: 'opacity 0.15s ease' },
          '& .MuiTreeItem-content:hover .view-in-timeline-btn': { opacity: 1 },
        }}
      >
        {filteredGroups.map((group) => {
          const tasks = filteredGrouped[group.id] || [];

          return (
            <Fragment key={group.id}>
              {/* Section label — top-level task name. Non-interactive except for
                  the hover-revealed "View in timeline" action (a top-level task
                  has no clickable row of its own — only its folders render). */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.5,
                  pt: 1.5,
                  pb: 0.25,
                  userSelect: 'none',
                  '&:hover .view-in-timeline-btn': { opacity: 1 },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    color: 'text.disabled',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.name}
                </Typography>
                <Tooltip title="View in timeline" arrow placement="top">
                  <IconButton
                    className="view-in-timeline-btn"
                    size="small"
                    aria-label="View in timeline"
                    onClick={() => handleViewInTimeline(group.id)}
                    sx={{
                      p: 0.25,
                      flexShrink: 0,
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <ChartBar size={13} weight="bold" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Groups with no child tasks show their folders directly */}
              {tasks.length === 0 && folderData.map((folder) => (
                <FolderNode
                  key={`task-${group.id}-${folder.id}`}
                  folder={folder}
                  taskId={`task-${group.id}`}
                  projectId={activeProjectId}
                  organizationId={activeOrganizationId}
                  expandedItems={expandedItems}
                />
              ))}

              {/* Child tasks — clicking expands to show folder subdirectories */}
              {tasks.map((task) => {
                const taskId = `task-${task.id}`;

                return (
                  <TreeItem
                    key={taskId}
                    itemId={taskId}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.375, minWidth: 0 }}>
                        <Hammer size={14} color={task.status.color} style={{ flexShrink: 0 }} />
                        <Box
                          sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {task.name}
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            fontSize: '0.6875rem',
                            flexShrink: 0,
                          }}
                        >
                          {task.progress !== undefined && task.progress > 0 && (
                            <Box sx={{ color: 'text.secondary' }}>{task.progress}%</Box>
                          )}
                          <Box sx={{ fontWeight: 500, color: task.status.color }}>
                            {task.status.name}
                          </Box>
                          <Tooltip title="View in timeline" arrow placement="top">
                            <IconButton
                              className="view-in-timeline-btn"
                              size="small"
                              aria-label="View in timeline"
                              // Stop the row from expanding/selecting when the button is used.
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInTimeline(task.id);
                              }}
                              sx={{
                                p: 0.375,
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                              }}
                            >
                              <ChartBar size={14} weight="bold" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    }
                  >
                    {folderData.map((folder) => (
                      <FolderNode
                        key={`${taskId}-${folder.id}`}
                        folder={folder}
                        taskId={taskId}
                        projectId={activeProjectId}
                        organizationId={activeOrganizationId}
                        expandedItems={expandedItems}
                      />
                    ))}
                  </TreeItem>
                );
              })}
            </Fragment>
          );
        })}
      </SimpleTreeView>
      )}
    </Box>
  );
}
