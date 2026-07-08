'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Trash, Warning, Swatches, CaretDown,
  Image as ImageIcon, UploadSimple, X, FloppyDisk,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import {
  Autocomplete as MuiAutocomplete,
  Box, Typography, Paper, Popover, TextField,
  IconButton, Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import DatePickerMaxHint from '@/components/ui/DatePickerMaxHint';
import Script from 'next/script';
import { useRouter, useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { api } from '@/trpc/react';
import { canDeleteProjects, canManageProjects } from '@/lib/permissions';
import { updateProjectSchema, type UpdateProjectInput } from '@/lib/validations/project';
import { PROJECT_ICON_OPTIONS, getProjectIcon } from '@/lib/constants/projectIconComponents';
import ProjectAvatar from '@/components/ui/ProjectAvatar';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/components/providers/ProjectProvider';
import { useSnackbar } from '@/hooks/useSnackbar';
import { env } from '@/env';
import { trackUpload } from '@/store/uploadStatusStore';

const GOOGLE_PLACES_API_KEY = env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// ---------------------------------------------------------------------------
// Location fields (reused from ProjectFormBody patterns)
// ---------------------------------------------------------------------------

function LocationAutocompleteField({
  value, onChange, error, helperText,
}: {
  value: string;
  onChange: (v: string, coords?: { lat: number; lng: number }) => void;
  error?: boolean;
  helperText?: string;
}) {
  const {
    ready,
    suggestions: { data },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ requestOptions: { types: ['address'] }, debounce: 300 });

  const [options, setOptions] = useState<string[]>([]);

  const handleInputChange = useCallback(
    (_e: React.SyntheticEvent, v: string) => { setSearchValue(v); onChange(v); },
    [setSearchValue, onChange],
  );

  useEffect(() => { setOptions(data.map((s) => s.description)); }, [data]);

  const handleSelect = useCallback(
    async (_e: React.SyntheticEvent, v: string | null) => {
      if (v) {
        clearSuggestions();
        try {
          const result = await getGeocode({ address: v });
          const first = result[0];
          if (first) {
            const { lat, lng } = await getLatLng(first);
            onChange(v, { lat, lng });
            return;
          }
          onChange(v);
        } catch {
          onChange(v);
        }
      } else { onChange(''); }
    },
    [onChange, clearSuggestions],
  );

  return (
    <MuiAutocomplete
      freeSolo options={options} inputValue={value}
      onInputChange={handleInputChange} onChange={handleSelect}
      disabled={!ready} filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField {...params} label="Location" placeholder="e.g. 123 Main St, New York, NY"
          error={error} helperText={helperText} fullWidth />
      )}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '8px', mt: 0.5,
            boxShadow: `0 8px 24px ${alpha('#000', 0.12)}`,
            '& .MuiAutocomplete-option': { fontSize: '0.875rem', py: 1, px: 1.75 },
          },
        },
      }}
    />
  );
}

function PlainLocationField({
  value, onChange, error, helperText,
}: { value: string; onChange: (v: string) => void; error?: boolean; helperText?: string }) {
  return (
    <TextField value={value} onChange={(e) => onChange(e.target.value)}
      label="Location" placeholder="e.g. 123 Main St, New York, NY" error={error} helperText={helperText}
      fullWidth autoComplete="off" />
  );
}

// ---------------------------------------------------------------------------
// Settings Form
// ---------------------------------------------------------------------------

function ProjectSettingsForm({
  projectId, organizationId,
}: { projectId: string; organizationId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams<{ orgSlug: string; projectSlug: string }>();
  const utils = api.useUtils();
  const { showSnackbar } = useSnackbar();
  const { projectName, projectIcon, projectImageUrl, projectLocation, projectStartDate } = useProjectContext();

  // Earliest scheduled task caps how late the project start may be set (a
  // project can't start after its first task). Drives the date picker `max`.
  const { data: earliestTask } = api.project.earliestTaskStart.useQuery(
    { projectId },
    { retry: false, enabled: !!projectId },
  );
  // Derive the cap from the earliest task's UTC calendar day rebuilt as a local
  // date, so the picker's day boundary matches what the server accepts (it
  // parses the picked yyyy-MM-dd as UTC midnight). Avoids an off-by-one when the
  // stored task timestamp has a time component that crosses local midnight.
  const startMax = (() => {
    if (!earliestTask?.date) return null;
    const d = new Date(earliestTask.date);
    if (Number.isNaN(d.getTime())) return null;
    const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return { date: local, label: format(local, 'MMM d, yyyy') };
  })();
  const startMaxDate = startMax?.date;
  const startLimitLabel = startMax?.label ?? null;

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [pickerMode, setPickerMode] = useState<'icon' | 'photo'>(projectImageUrl ? 'photo' : 'icon');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [iconAnchorEl, setIconAnchorEl] = useState<HTMLElement | null>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors, isDirty, dirtyFields } } =
    useForm<UpdateProjectInput>({
      resolver: zodResolver(updateProjectSchema),
      defaultValues: {
        name: projectName,
        location: projectLocation,
        icon: (projectIcon ?? 'building') as UpdateProjectInput['icon'],
        imageUrl: projectImageUrl ?? undefined,
        // ISO from context → yyyy-MM-dd for the native date input
        startDate: projectStartDate ? projectStartDate.slice(0, 10) : '',
      },
    });

  const selectedIcon = watch('icon') ?? 'building';
  const imageUrl = watch('imageUrl');
  const displayImageUrl = previewUrl ?? imageUrl;
  const SelectedIconComponent = getProjectIcon(selectedIcon);
  const selectedIconLabel = PROJECT_ICON_OPTIONS.find(o => o.id === selectedIcon)?.label ?? 'Building';

  const imageChanged = imageUrl !== (projectImageUrl ?? undefined);

  const cleanupUploadedImage = useCallback((url?: string) => {
    const urlToDelete = url ?? uploadedUrlRef.current;
    if (urlToDelete && organizationId) {
      void fetch('/api/project/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: urlToDelete, organizationId }),
      }).catch(() => {});
      uploadedUrlRef.current = null;
    }
  }, [organizationId]);

  useEffect(() => {
    return () => {
      if (uploadedUrlRef.current) {
        const urlToDelete = uploadedUrlRef.current;
        if (urlToDelete && organizationId) {
          void fetch('/api/project/image', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: urlToDelete, organizationId }),
          }).catch(() => {});
        }
      }
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMutation = api.project.update.useMutation({
    onSuccess: (updated) => {
      showSnackbar('Project updated', 'success');
      uploadedUrlRef.current = null;
      void utils.project.list.invalidate();
      void utils.project.getActive.invalidate();
      void utils.project.getBySlug.invalidate();
      void utils.project.getById.invalidate();
      if (updated.slug !== params.projectSlug) {
        router.replace(`/${params.orgSlug}/projects/${updated.slug}/settings`);
      }
    },
    onError: (err) => {
      showSnackbar(err.message || 'Failed to update project', 'error');
    },
  });

  const onSubmit = (data: UpdateProjectInput) => {
    // Only send startDate if the user actually edited it here. The default is
    // seeded from the (server-rendered) project context, which can be stale if
    // the start date was changed via the Gantt's ProjectStartCard. Omitting an
    // untouched field prevents an unrelated edit (e.g. name) from clobbering it.
    const { startDate, ...rest } = data;
    const payload: UpdateProjectInput & { projectId: string } = { ...rest, projectId };
    if (dirtyFields.startDate) payload.startDate = startDate;
    updateMutation.mutate(payload);
  };

  const handlePhotoDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !organizationId) return;
    setIsUploading(true);
    setUploadError(null);
    const localPreview = URL.createObjectURL(file);

    const result = await trackUpload<{ imageUrl: string }>(
      file,
      () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', organizationId);
        return fetch('/api/project/image', { method: 'POST', body: formData });
      },
      { doneLabel: 'Cover image ready' },
    );

    if (!result.ok || !result.data?.imageUrl) {
      URL.revokeObjectURL(localPreview);
      setUploadError(result.error ?? 'Upload failed');
      setIsUploading(false);
      return;
    }

    if (uploadedUrlRef.current) cleanupUploadedImage(uploadedUrlRef.current);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localPreview;
    });
    uploadedUrlRef.current = result.data.imageUrl;
    setValue('imageUrl', result.data.imageUrl, { shouldDirty: true });
    setIsUploading(false);
  }, [organizationId, setValue, cleanupUploadedImage]);

  const handleRemovePhoto = useCallback(() => {
    if (uploadedUrlRef.current) cleanupUploadedImage();
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setValue('imageUrl', undefined, { shouldDirty: true });
    setUploadError(null);
  }, [setValue, cleanupUploadedImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handlePhotoDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1, maxSize: 5 * 1024 * 1024, disabled: isUploading,
    onDropRejected: (rejections) => {
      const error = rejections[0]?.errors[0];
      if (error?.code === 'file-too-large') setUploadError('File size exceeds 5MB limit');
      else if (error?.code === 'file-invalid-type') setUploadError('Only image files are allowed');
      else setUploadError('File not accepted');
    },
  });

  const handleSwitchToIcon = useCallback(() => {
    setPickerMode('icon');
    setUploadError(null);
    if (uploadedUrlRef.current) {
      cleanupUploadedImage();
      setValue('imageUrl', undefined, { shouldDirty: true });
    }
  }, [setValue, cleanupUploadedImage]);

  const handleSwitchToPhoto = useCallback(() => {
    setPickerMode('photo');
    setUploadError(null);
  }, []);

  const useGooglePlaces = !!GOOGLE_PLACES_API_KEY && scriptLoaded;
  const hasChanges = isDirty || imageChanged;

  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {GOOGLE_PLACES_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`}
          strategy="lazyOnload"
          onReady={() => setScriptLoaded(true)}
        />
      )}

      {/* Card header — title + live preview on the left, Save action on the right */}
      <Box sx={{
        px: 3, py: 2.5, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 2,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '12px',
            bgcolor: displayImageUrl ? 'transparent' : alpha(theme.palette.primary.main, 0.08),
            border: displayImageUrl ? 'none' : `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden',
          }}>
            <ProjectAvatar
              imageUrl={displayImageUrl}
              icon={selectedIcon}
              size={displayImageUrl ? 48 : 24}
              borderRadius="12px"
              color={theme.palette.primary.main}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>
              Project Details
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
              Update your project name, location, and image
            </Typography>
          </Box>
        </Box>
        <Button type="submit" form="settings-form" variant="contained"
          disabled={!hasChanges || isUploading}
          loading={updateMutation.isPending}
          startIcon={<FloppyDisk size={15} />}
          sx={{
            flexShrink: 0, borderRadius: '8px', fontWeight: 600, fontSize: '0.8125rem',
            px: 2.5, py: 1, textTransform: 'none',
            boxShadow: `0 1px 3px ${alpha(theme.palette.primary.main, 0.3)}`,
            '&:hover': { boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.35)}` },
          }}>
          Save Changes
        </Button>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} id="settings-form" sx={{ px: 3, py: 3 }}>
        {/* Two-column body — identity picker on the left, text fields on the right */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 3, md: 5 } }}>
          {/* Left column — image / icon identity */}
          <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
            <Typography sx={{
              fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary',
              textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1, userSelect: 'none',
            }}>
              Project Image
            </Typography>

            {/* Picker Mode Toggle */}
            <Box
              role="radiogroup" aria-label="Project image type"
              sx={{
                display: 'inline-flex', borderRadius: '8px',
                // divider is already translucent — alpha()-ing it again renders invisible
                bgcolor: 'action.selected', p: '3px', mb: 1.5,
              }}
            >
            {(['icon', 'photo'] as const).map((mode) => {
              const isActive = pickerMode === mode;
              const Icon = mode === 'icon' ? Swatches : ImageIcon;
              return (
                <Box key={mode} component="button" type="button" role="radio"
                  aria-checked={isActive}
                  onClick={mode === 'icon' ? handleSwitchToIcon : handleSwitchToPhoto}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.5, py: 0.625, borderRadius: '6px', border: 'none',
                    cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                    fontFamily: 'inherit', letterSpacing: '0.02em',
                    transition: 'all 0.15s ease',
                    bgcolor: isActive ? 'background.paper' : 'transparent',
                    outline: isActive ? '1px solid' : 'none',
                    outlineColor: 'divider',
                    color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                    boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                    '&:hover': {
                      color: theme.palette.text.primary,
                    },
                  }}
                >
                  <Icon size={14} weight={isActive ? 'fill' : 'regular'} />
                  {mode === 'icon' ? 'Icon' : 'Photo'}
                </Box>
              );
            })}
          </Box>

          {/* Icon Picker (dropdown) */}
          {pickerMode === 'icon' && (
            <Controller name="icon" control={control} render={({ field }) => (
              <>
                <Box
                  component="button" type="button"
                  onClick={(e: React.MouseEvent<HTMLElement>) => setIconAnchorEl(e.currentTarget)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.5, py: 1, mb: 2.5, borderRadius: '8px',
                    border: '1.5px solid', borderColor: 'divider',
                    bgcolor: 'action.hover',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '0.8125rem', fontWeight: 500, color: 'text.primary',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <SelectedIconComponent size={18} weight="fill" />
                  {selectedIconLabel}
                  <CaretDown size={12} style={{ marginLeft: 'auto', color: theme.palette.text.secondary }} />
                </Box>
                <Popover
                  open={!!iconAnchorEl} anchorEl={iconAnchorEl}
                  onClose={() => setIconAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: '10px', mt: 0.5, p: 1,
                        boxShadow: `0 8px 24px ${alpha('#000', 0.12)}`,
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                    {PROJECT_ICON_OPTIONS.map(({ id, label, Icon }) => {
                      const isSelected = (field.value ?? 'building') === id;
                      return (
                        <Tooltip key={id} title={label} arrow placement="top">
                          <Box component="button" type="button"
                            onClick={() => { field.onChange(id); setIconAnchorEl(null); }}
                            sx={{
                              width: 36, height: 36, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              borderRadius: '8px', border: '1.5px solid',
                              borderColor: isSelected ? theme.palette.primary.main : 'transparent',
                              bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                              color: isSelected ? theme.palette.primary.main : theme.palette.text.secondary,
                              cursor: 'pointer', transition: 'all 0.15s ease', p: 0,
                              '&:hover': {
                                bgcolor: isSelected
                                  ? alpha(theme.palette.primary.main, 0.12)
                                  : theme.palette.action.hover,
                                color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                              },
                            }}
                          >
                            <Icon size={18} weight={isSelected ? 'fill' : 'regular'} />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Popover>
              </>
            )} />
          )}

          {/* Photo Picker */}
          {pickerMode === 'photo' && (
            <Box sx={{ mb: 2.5 }}>
              {displayImageUrl ? (
                <Box sx={{ position: 'relative', '&:hover .remove-photo-btn': { opacity: 1 } }}>
                  <Box component="img" src={displayImageUrl} alt="Project cover"
                    sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '10px' }} />
                  <IconButton className="remove-photo-btn" onClick={handleRemovePhoto}
                    aria-label="Remove uploaded photo"
                    sx={{
                      position: 'absolute', top: 6, right: 6,
                      bgcolor: alpha('#000', 0.5), '&:hover': { bgcolor: alpha('#000', 0.7) },
                      opacity: 0, transition: 'opacity 0.2s', color: 'white', p: 0.5,
                    }}>
                    <X size={14} />
                  </IconButton>
                </Box>
              ) : (
                <Box {...getRootProps()} aria-label="Upload project photo" aria-busy={isUploading}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 0.75, py: 2.5,
                    border: '1.5px dashed',
                    borderColor: uploadError ? theme.palette.error.main
                      : isDragActive ? theme.palette.primary.main
                      : theme.palette.divider,
                    borderRadius: '10px',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    opacity: isUploading ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: isUploading ? theme.palette.divider : alpha(theme.palette.primary.main, 0.4),
                      bgcolor: isUploading ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
                    },
                  }}>
                  <input {...getInputProps()} />
                  <UploadSimple size={20} style={{ color: theme.palette.text.secondary }} />
                  <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                    {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                    PNG, JPG, WebP up to 5MB
                  </Typography>
                </Box>
              )}
              {uploadError && (
                <Typography sx={{ fontSize: '0.75rem', color: 'error.main', mt: 0.75 }}>
                  {uploadError}
                </Typography>
              )}
            </Box>
          )}
          </Box>

          {/* Right column — name + location */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Project Name */}
            <Controller name="name" control={control} render={({ field }) => (
              <TextField {...field} id="settings-name-input"
                label="Project Name"
                placeholder="e.g. Downtown Tower Construction"
                error={!!errors.name} helperText={errors.name?.message}
                fullWidth autoComplete="off" />
            )} />

            {/* Location */}
            <Controller name="location" control={control} render={({ field }) =>
              useGooglePlaces ? (
                <LocationAutocompleteField
                  value={field.value ?? ''}
                  onChange={(v, coords) => {
                    field.onChange(v);
                    if (coords) {
                      setValue('latitude', coords.lat, { shouldDirty: true });
                      setValue('longitude', coords.lng, { shouldDirty: true });
                    } else {
                      setValue('latitude', undefined, { shouldDirty: true });
                      setValue('longitude', undefined, { shouldDirty: true });
                    }
                  }}
                  error={!!errors.location} helperText={errors.location?.message} />
              ) : (
                <PlainLocationField value={field.value ?? ''} onChange={field.onChange}
                  error={!!errors.location} helperText={errors.location?.message} />
              )
            } />

            {/* Project start date — the Gantt scheduling floor. Dates after the
                earliest task are disabled (a project can't start after its
                first task); an info tooltip explains the cap. The form value is
                a yyyy-MM-dd string (wire format); the picker works in Dates, so
                convert at the boundary. */}
            <Controller name="startDate" control={control} render={({ field }) => (
              <DatePicker
                label="Project start date"
                value={field.value ? new Date(field.value) : null}
                onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')}
                maxDate={startMaxDate}
                slots={startLimitLabel ? { actionBar: () => <DatePickerMaxHint limitLabel={startLimitLabel} /> } : undefined}
                slotProps={{
                  textField: {
                    id: 'settings-start-date-input',
                    fullWidth: true,
                    error: !!errors.startDate,
                    helperText:
                      errors.startDate?.message ??
                      (startLimitLabel
                        ? `Must be on or before your earliest task (${startLimitLabel})`
                        : 'Earliest date tasks can be scheduled on the Gantt'),
                  },
                }}
              />
            )} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Settings Page
// ---------------------------------------------------------------------------

export default function ProjectSettingsPage() {
  const theme = useTheme();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { projectId, projectName, organizationId } = useProjectContext();

  const { data: members = [] } = api.projectMember.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: currentUser } = api.user.me.useQuery();
  const currentMembership = members.find((m) => m.user.id === currentUser?.id);
  const canDelete = currentMembership ? canDeleteProjects(currentMembership.role) : false;
  const canEdit = currentMembership ? canManageProjects(currentMembership.role) : false;

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{ p: 3 }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Project Settings
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {projectName}
          </Typography>
        </Box>
      </Box>

      {/* Project Details — edit form */}
      {canEdit ? (
        <ProjectSettingsForm projectId={projectId} organizationId={organizationId} />
      ) : (
        <Paper
          elevation={0}
          sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', px: 3, py: 2.5 }}
        >
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Only project owners and admins can edit project settings.
          </Typography>
        </Paper>
      )}

      {/* Danger Zone — delete */}
      {canDelete && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            border: 1,
            borderColor: alpha(theme.palette.error.main, 0.25),
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            px: 3, py: 1.5,
            bgcolor: alpha(theme.palette.error.main, 0.04),
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.15),
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <Warning size={14} color={theme.palette.error.main} />
            <Typography sx={{
              fontSize: '0.75rem', fontWeight: 600, color: 'error.main',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Danger Zone
            </Typography>
          </Box>
          <Box sx={{
            px: 3, py: 2.5, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 2,
          }}>
            <Box>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', mb: 0.25 }}>
                Delete this project
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', lineHeight: 1.5 }}>
                Permanently delete this project and all its data. This cannot be undone.
              </Typography>
            </Box>
            <Button variant="outlined" color="error"
              onClick={() => setDeleteDialogOpen(true)}
              startIcon={<Trash size={14} />}
              sx={{
                flexShrink: 0, borderRadius: '8px', fontWeight: 600,
                fontSize: '0.8125rem', textTransform: 'none',
              }}>
              Delete
            </Button>
          </Box>
        </Paper>
      )}

      {/* Delete Project Dialog */}
      <DeleteProjectDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
        project={projectId ? { id: projectId, name: projectName } : null} />
    </Box>
  );
}
