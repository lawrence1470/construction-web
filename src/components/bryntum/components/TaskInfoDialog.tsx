'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { X, Trash } from '@phosphor-icons/react';
import type {
  BryntumTaskRecord,
  BryntumGanttInstance,
  BryntumDependencyRecord,
  BryntumAssignmentRecord,
} from '../types';

const DEPENDENCY_TYPES: { value: number; label: string }[] = [
  { value: 2, label: 'Finish to Start' },
  { value: 0, label: 'Start to Start' },
  { value: 3, label: 'Finish to Finish' },
  { value: 1, label: 'Start to Finish' },
];

const CONSTRAINT_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'muststarton', label: 'Must Start On' },
  { value: 'mustfinishon', label: 'Must Finish On' },
  { value: 'startnoearlierthan', label: 'Start No Earlier Than' },
  { value: 'startnolaterthan', label: 'Start No Later Than' },
  { value: 'finishnoearlierthan', label: 'Finish No Earlier Than' },
  { value: 'finishnolaterthan', label: 'Finish No Later Than' },
];

const DURATION_UNITS: { value: string; label: string }[] = [
  { value: 'hour', label: 'Hours' },
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
];

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateAsLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function getDependencyTypeLabel(type: number): string {
  return DEPENDENCY_TYPES.find(d => d.value === type)?.label ?? 'Finish to Start';
}

interface GeneralFormState {
  name: string;
  percentDone: number;
  effort: number | null;
  effortUnit: string;
  startDate: string;
  endDate: string;
  duration: number | null;
  durationUnit: string;
}

interface AdvancedFormState {
  manuallyScheduled: boolean;
  constraintType: string;
  constraintDate: string;
  rollup: boolean;
  cls: string;
  note: string;
}

interface TaskInfoDialogProps {
  open: boolean;
  taskRecord: BryntumTaskRecord | null;
  ganttInstance: BryntumGanttInstance | null;
  onClose: () => void;
  onDelete: () => void;
}

const fieldLabelSx = {
  fontSize: 13,
  fontWeight: 500,
  color: 'text.secondary',
  fontFamily: 'Inter, sans-serif',
  mb: 0.5,
} as const;

const inputSx = {
  '& .MuiInputBase-root': { fontSize: 13, fontFamily: 'Inter, sans-serif' },
  '& .MuiInputBase-input': { py: 1, px: 1.5 },
} as const;

export default function TaskInfoDialog({
  open,
  taskRecord,
  ganttInstance,
  onClose,
  onDelete,
}: TaskInfoDialogProps) {
  const [activeTab, setActiveTab] = useState(0);

  const [general, setGeneral] = useState<GeneralFormState>({
    name: '',
    percentDone: 0,
    effort: null,
    effortUnit: 'hour',
    startDate: '',
    endDate: '',
    duration: null,
    durationUnit: 'day',
  });

  const [advanced, setAdvanced] = useState<AdvancedFormState>({
    manuallyScheduled: false,
    constraintType: '',
    constraintDate: '',
    rollup: false,
    cls: '',
    note: '',
  });

  // Counter to force re-render after Bryntum store mutations
  const [, setStoreVersion] = useState(0);

  // Load form state from task record when dialog opens
  useEffect(() => {
    if (!open || !taskRecord) return;
    setActiveTab(0);
    setGeneral({
      name: taskRecord.name ?? '',
      percentDone: taskRecord.percentDone ?? 0,
      effort: taskRecord.effort,
      effortUnit: taskRecord.effortUnit ?? 'hour',
      startDate: formatDateForInput(taskRecord.startDate),
      endDate: formatDateForInput(taskRecord.endDate),
      duration: taskRecord.duration,
      durationUnit: taskRecord.durationUnit ?? 'day',
    });
    setAdvanced({
      manuallyScheduled: taskRecord.manuallyScheduled ?? false,
      constraintType: taskRecord.constraintType ?? '',
      constraintDate: formatDateForInput(taskRecord.constraintDate),
      rollup: taskRecord.rollup ?? false,
      cls: taskRecord.cls ?? '',
      note: taskRecord.note ?? '',
    });
  }, [open, taskRecord]);

  const isParent = taskRecord?.isParent ?? false;
  const isScheduleReadOnly = isParent && !advanced.manuallyScheduled;

  const handleSave = useCallback(() => {
    if (!taskRecord) return;

    const updates: Record<string, unknown> = {};

    // General tab diffs
    if (general.name !== (taskRecord.name ?? '')) updates.name = general.name;
    if (general.percentDone !== (taskRecord.percentDone ?? 0)) updates.percentDone = general.percentDone;
    if (general.effort !== taskRecord.effort) updates.effort = general.effort;
    if (general.effortUnit !== (taskRecord.effortUnit ?? 'hour')) updates.effortUnit = general.effortUnit;

    if (!isScheduleReadOnly) {
      const newStart = general.startDate ? parseDateAsLocal(general.startDate) : null;
      const oldStart = taskRecord.startDate ? formatDateForInput(taskRecord.startDate) : '';
      if (general.startDate !== oldStart) updates.startDate = newStart;

      const oldEnd = taskRecord.endDate ? formatDateForInput(taskRecord.endDate) : '';
      if (general.endDate !== oldEnd) updates.endDate = general.endDate ? parseDateAsLocal(general.endDate) : null;

      if (general.duration !== taskRecord.duration) updates.duration = general.duration;
      if (general.durationUnit !== (taskRecord.durationUnit ?? 'day')) updates.durationUnit = general.durationUnit;
    }

    // Advanced tab diffs
    if (advanced.manuallyScheduled !== (taskRecord.manuallyScheduled ?? false))
      updates.manuallyScheduled = advanced.manuallyScheduled;
    if (advanced.constraintType !== (taskRecord.constraintType ?? ''))
      updates.constraintType = advanced.constraintType || null;
    if (advanced.constraintDate !== formatDateForInput(taskRecord.constraintDate))
      updates.constraintDate = advanced.constraintDate ? parseDateAsLocal(advanced.constraintDate) : null;
    if (advanced.rollup !== (taskRecord.rollup ?? false)) updates.rollup = advanced.rollup;
    if (advanced.cls !== (taskRecord.cls ?? '')) updates.cls = advanced.cls || null;
    if (advanced.note !== (taskRecord.note ?? '')) updates.note = advanced.note || null;

    if (Object.keys(updates).length > 0) {
      taskRecord.set(updates);
    }

    onClose();
  }, [taskRecord, general, advanced, isScheduleReadOnly, onClose]);

  // Get predecessors/successors/assignments from Bryntum stores
  const predecessors = taskRecord?.predecessors ?? [];
  const successors = taskRecord?.successors ?? [];

  const assignments: BryntumAssignmentRecord[] = [];
  if (ganttInstance && taskRecord) {
    for (const a of ganttInstance.project.assignmentStore.allRecords) {
      if (a.event?.id === taskRecord.id) {
        assignments.push(a);
      }
    }
  }

  const availableResources = ganttInstance?.project.resourceStore.allRecords ?? [];

  const handleRemoveDependency = useCallback((dep: BryntumDependencyRecord) => {
    dep.remove();
    setStoreVersion(v => v + 1);
  }, []);

  const handleRemoveAssignment = useCallback((assignment: BryntumAssignmentRecord) => {
    assignment.remove();
    setStoreVersion(v => v + 1);
  }, []);

  const handleAddAssignment = useCallback((resourceId: string | number) => {
    if (!ganttInstance || !taskRecord) return;
    ganttInstance.project.assignmentStore.add({
      event: taskRecord.id,
      resource: resourceId,
      units: 100,
    });
    setStoreVersion(v => v + 1);
  }, [ganttInstance, taskRecord]);

  // Create a Finish-to-Start dependency. A predecessor links the OTHER task →
  // this one; a successor links this task → the other. Bryntum draws the
  // connector line immediately and autoSync persists it via gantt.sync.
  const handleAddDependency = useCallback(
    (otherTaskId: string | number, direction: 'predecessor' | 'successor') => {
      if (!ganttInstance || !taskRecord) return;
      const from = direction === 'predecessor' ? otherTaskId : taskRecord.id;
      const to = direction === 'predecessor' ? taskRecord.id : otherTaskId;
      ganttInstance.project.dependencyStore.add({ from, to, type: 2 });
      setStoreVersion(v => v + 1);
    },
    [ganttInstance, taskRecord],
  );

  // Tasks selectable as a new predecessor/successor: every other task that
  // isn't already linked in that direction (and not this task itself).
  const allTasks = ganttInstance?.project.taskStore.allRecords ?? [];
  const predecessorTaskIds = new Set(predecessors.map(d => String(d.fromTask?.id)));
  const successorTaskIds = new Set(successors.map(d => String(d.toTask?.id)));
  const tasksForPredecessor = allTasks.filter(
    t => t.name && String(t.id) !== String(taskRecord?.id) && !predecessorTaskIds.has(String(t.id)),
  );
  const tasksForSuccessor = allTasks.filter(
    t => t.name && String(t.id) !== String(taskRecord?.id) && !successorTaskIds.has(String(t.id)),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: 'text.primary',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          Task Information
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            mt: -0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <X size={16} />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              textTransform: 'none',
              minHeight: 36,
              px: 1.5,
              py: 0,
            },
          }}
        >
          <Tab label="General" />
          <Tab label="Predecessors" />
          <Tab label="Successors" />
          <Tab label="Resources" />
          <Tab label="Advanced" />
        </Tabs>
      </Box>

      <Divider />

      {/* Tab Panels */}
      <Box sx={{ px: 3, py: 2.5, minHeight: 320 }}>
        {/* General Tab */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={fieldLabelSx}>Name</Typography>
              <TextField
                fullWidth
                size="small"
                value={general.name}
                onChange={(e) => setGeneral(s => ({ ...s, name: e.target.value }))}
                sx={inputSx}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>% Complete</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  value={general.percentDone}
                  onChange={(e) => setGeneral(s => ({ ...s, percentDone: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                  sx={inputSx}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>Effort</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={general.effort ?? ''}
                    onChange={(e) => setGeneral(s => ({ ...s, effort: e.target.value ? Number(e.target.value) : null }))}
                    sx={inputSx}
                  />
                  <Select
                    size="small"
                    value={general.effortUnit}
                    onChange={(e) => setGeneral(s => ({ ...s, effortUnit: e.target.value }))}
                    sx={{ minWidth: 90, fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                  >
                    {DURATION_UNITS.map(u => (
                      <MenuItem key={u.value} value={u.value} sx={{ fontSize: 13 }}>{u.label}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>Start</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={general.startDate}
                  disabled={isScheduleReadOnly}
                  onChange={(e) => setGeneral(s => ({ ...s, startDate: e.target.value }))}
                  sx={inputSx}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>Finish</Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={general.endDate}
                  disabled={isScheduleReadOnly}
                  onChange={(e) => setGeneral(s => ({ ...s, endDate: e.target.value }))}
                  sx={inputSx}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>Duration</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={general.duration ?? ''}
                    disabled={isScheduleReadOnly}
                    onChange={(e) => setGeneral(s => ({ ...s, duration: e.target.value ? Number(e.target.value) : null }))}
                    sx={inputSx}
                  />
                  <Select
                    size="small"
                    value={general.durationUnit}
                    disabled={isScheduleReadOnly}
                    onChange={(e) => setGeneral(s => ({ ...s, durationUnit: e.target.value }))}
                    sx={{ minWidth: 90, fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                  >
                    {DURATION_UNITS.map(u => (
                      <MenuItem key={u.value} value={u.value} sx={{ fontSize: 13 }}>{u.label}</MenuItem>
                    ))}
                  </Select>
                </Box>
              </Box>
              <Box sx={{ flex: 1 }} />
            </Box>

            {isScheduleReadOnly && (
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>
                Schedule fields are read-only for parent tasks. Enable &quot;Manually Scheduled&quot; in the Advanced tab to edit.
              </Typography>
            )}
          </Box>
        )}

        {/* Predecessors Tab */}
        {activeTab === 1 && (
          <DependencyList
            dependencies={predecessors}
            direction="predecessor"
            onRemove={handleRemoveDependency}
            availableTasks={tasksForPredecessor}
            onAdd={handleAddDependency}
          />
        )}

        {/* Successors Tab */}
        {activeTab === 2 && (
          <DependencyList
            dependencies={successors}
            direction="successor"
            onRemove={handleRemoveDependency}
            availableTasks={tasksForSuccessor}
            onAdd={handleAddDependency}
          />
        )}

        {/* Resources Tab */}
        {activeTab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {assignments.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
                No resources assigned to this task.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', gap: 2, px: 1 }}>
                  <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'text.secondary', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Resource
                  </Typography>
                  <Typography sx={{ width: 80, fontSize: 11, fontWeight: 600, color: 'text.secondary', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Units
                  </Typography>
                  <Box sx={{ width: 32 }} />
                </Box>
                {assignments.map((a) => (
                  <Box
                    key={String(a.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      px: 1,
                      py: 0.75,
                      borderRadius: '6px',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography sx={{ flex: 1, fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'text.primary' }}>
                      {a.resource?.name ?? 'Unknown'}
                    </Typography>
                    <Typography sx={{ width: 80, fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'text.secondary' }}>
                      {a.units}%
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAssignment(a)}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <Trash size={14} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* Add resource */}
            {availableResources.length > 0 && (
              <Box>
                <Typography sx={{ ...fieldLabelSx, mt: 1 }}>Add Resource</Typography>
                <Select
                  size="small"
                  value=""
                  displayEmpty
                  onChange={(e) => {
                    if (e.target.value) handleAddAssignment(e.target.value as string);
                  }}
                  sx={{ width: '100%', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: 13 }}>Select a resource...</MenuItem>
                  {availableResources
                    .filter(r => !assignments.some(a => a.resource?.id === r.id))
                    .map(r => (
                      <MenuItem key={String(r.id)} value={String(r.id)} sx={{ fontSize: 13 }}>
                        {r.name}
                      </MenuItem>
                    ))
                  }
                </Select>
              </Box>
            )}
          </Box>
        )}

        {/* Advanced Tab */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={advanced.manuallyScheduled}
                  onChange={(e) => setAdvanced(s => ({ ...s, manuallyScheduled: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                  Manually Scheduled
                </Typography>
              }
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={fieldLabelSx}>Constraint Type</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={advanced.constraintType}
                  onChange={(e) => setAdvanced(s => ({ ...s, constraintType: e.target.value }))}
                  sx={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}
                >
                  {CONSTRAINT_TYPES.map(c => (
                    <MenuItem key={c.value} value={c.value} sx={{ fontSize: 13 }}>{c.label}</MenuItem>
                  ))}
                </Select>
              </Box>
              {advanced.constraintType && (
                <Box sx={{ flex: 1 }}>
                  <Typography sx={fieldLabelSx}>Constraint Date</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={advanced.constraintDate}
                    onChange={(e) => setAdvanced(s => ({ ...s, constraintDate: e.target.value }))}
                    sx={inputSx}
                  />
                </Box>
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={advanced.rollup}
                  onChange={(e) => setAdvanced(s => ({ ...s, rollup: e.target.checked }))}
                  size="small"
                />
              }
              label={
                <Typography sx={{ fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                  Rollup
                </Typography>
              }
            />

            <Box>
              <Typography sx={fieldLabelSx}>CSS Class</Typography>
              <TextField
                fullWidth
                size="small"
                value={advanced.cls}
                onChange={(e) => setAdvanced(s => ({ ...s, cls: e.target.value }))}
                sx={inputSx}
              />
            </Box>

            <Box>
              <Typography sx={fieldLabelSx}>Notes</Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={advanced.note}
                onChange={(e) => setAdvanced(s => ({ ...s, note: e.target.value }))}
                sx={inputSx}
              />
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          color="error"
          onClick={onDelete}
          startIcon={<Trash size={14} />}
          sx={{
            height: 34,
            px: 2,
            fontSize: 13,
            fontWeight: 500,
            borderRadius: '8px',
            textTransform: 'none',
          }}
        >
          Delete
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              height: 34,
              px: 2,
              fontSize: 13,
              fontWeight: 500,
              color: 'text.primary',
              borderColor: 'divider',
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              height: 34,
              px: 2,
              fontSize: 13,
              fontWeight: 500,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}

/** Reusable dependency list for predecessors and successors tabs. */
function DependencyList({
  dependencies,
  direction,
  onRemove,
  availableTasks,
  onAdd,
}: {
  dependencies: BryntumDependencyRecord[];
  direction: 'predecessor' | 'successor';
  onRemove: (dep: BryntumDependencyRecord) => void;
  availableTasks: BryntumTaskRecord[];
  onAdd: (taskId: string | number, direction: 'predecessor' | 'successor') => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {dependencies.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontFamily: 'Inter, sans-serif' }}>
          No {direction}s for this task.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', gap: 2, px: 1 }}>
        <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'text.secondary', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Task
        </Typography>
        <Typography sx={{ width: 140, fontSize: 11, fontWeight: 600, color: 'text.secondary', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Type
        </Typography>
        <Typography sx={{ width: 60, fontSize: 11, fontWeight: 600, color: 'text.secondary', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Lag
        </Typography>
        <Box sx={{ width: 32 }} />
      </Box>
      {/* Rows */}
      {dependencies.map((dep) => {
        const linkedTask = direction === 'predecessor' ? dep.fromTask : dep.toTask;
        return (
          <Box
            key={String(dep.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              px: 1,
              py: 0.75,
              borderRadius: '6px',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography
              sx={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {linkedTask?.name ?? 'Unknown'}
            </Typography>
            <Typography sx={{ width: 140, fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'text.secondary' }}>
              {getDependencyTypeLabel(dep.type)}
            </Typography>
            <Typography sx={{ width: 60, fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'text.secondary' }}>
              {dep.lag ?? 0}{dep.lagUnit ? ` ${dep.lagUnit}` : ''}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onRemove(dep)}
              sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
            >
              <Trash size={14} />
            </IconButton>
          </Box>
            );
          })}
        </Box>
      )}

      {/* Add predecessor/successor — mirrors the Resources tab's Add control.
          Creates a Finish-to-Start dependency; the connector line draws at once. */}
      {availableTasks.length > 0 && (
        <Box>
          <Typography sx={{ ...fieldLabelSx, mt: 1 }}>Add {direction}</Typography>
          <Select
            size="small"
            value=""
            displayEmpty
            onChange={(e) => {
              if (e.target.value) onAdd(e.target.value as string, direction);
            }}
            sx={{ width: '100%', fontSize: 13, fontFamily: 'Inter, sans-serif' }}
          >
            <MenuItem value="" disabled sx={{ fontSize: 13 }}>Select a task...</MenuItem>
            {availableTasks.map((t) => (
              <MenuItem key={String(t.id)} value={String(t.id)} sx={{ fontSize: 13 }}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}
    </Box>
  );
}
